# TTS 性能优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 消除音频传输中的 base64 编解码冗余，添加 LRU 缓存减少重复 API 调用。

**架构：** 服务端将 MiMo 返回的 base64 解码为 Buffer，直接返回 `audio/wav` 二进制。新增基于 `Map` 的 LRU 缓存，以 SHA256(请求参数) 为 key 缓存解码后的 Buffer。前端直接消费 `ArrayBuffer`，移除 `atob` 解码循环。

**技术栈：** Express 4 (ESM, TypeScript), Vue 3 (Composition API), Node.js crypto (内置)

---

### 任务 1: LRU 缓存 (`server/src/cache.ts`)

**文件：**
- 新建: `server/src/cache.ts`

- [ ] **步骤 1: 创建 LRU 缓存类**

```typescript
import { Buffer } from 'node:buffer'

export class LruCache {
  private maxSize: number
  private cache: Map<string, Buffer>

  constructor(maxSize = 50) {
    this.maxSize = maxSize
    this.cache = new Map()
  }

  get(key: string): Buffer | undefined {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: string, value: Buffer): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

export const audioCache = new LruCache(50)
```

- [ ] **步骤 2: 添加缓存 key 生成函数**

添加到 `server/src/cache.ts`:

```typescript
import { createHash } from 'node:crypto'

interface CacheKeyParams {
  text: string
  voiceId: string
  styleMode?: string
  stylePrompt?: string
  styleTag?: string
}

export function makeCacheKey(params: CacheKeyParams): string {
  const raw = `${params.text}|${params.voiceId}|${params.styleMode ?? ''}|${params.stylePrompt ?? ''}|${params.styleTag ?? ''}`
  return createHash('sha256').update(raw).digest('hex')
}
```

- [ ] **步骤 3: 提交**

```bash
git add server/src/cache.ts
git commit -m "feat: add LRU cache for TTS audio responses"
```

---

### 任务 2: 服务端返回二进制 + 接入缓存 (`server/src/routes/tts.ts`)

**文件：**
- 修改: `server/src/routes/tts.ts`

- [ ] **步骤 1: 引入缓存**

将：
```typescript
import { config } from '../config.js'
```
替换为：
```typescript
import { config } from '../config.js'
import { audioCache, makeCacheKey } from '../cache.js'
```

- [ ] **步骤 2: 修改 `callMimoTts` 返回类型从 `string` 改为 `Buffer`**

将：
```typescript
async function callMimoTts(params: TtsParams): Promise<string> {
```
以及结尾的 `return audioBase64`：
```typescript
  return audioBase64
```
替换为：
```typescript
  return Buffer.from(audioBase64, 'base64')
```

- [ ] **步骤 3: 更新 POST `/tts`，返回二进制 + 使用缓存**

将 POST 路由处理体（第 67-87 行）替换为：

```typescript
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceId, styleMode, stylePrompt, styleTag } = req.body as TtsRequestBody

    if (!text || !text.trim()) {
      res.status(400).json({ error: '合成文本不能为空' })
      return
    }

    if (!config.apiKey) {
      res.status(500).json({ error: 'API Key 未配置，请在 server/.env 中设置 MIMO_API_KEY' })
      return
    }

    const key = makeCacheKey({ text, voiceId, styleMode, stylePrompt, styleTag })
    let buffer = audioCache.get(key)

    if (!buffer) {
      buffer = await callMimoTts({ text, voiceId, styleMode, stylePrompt, styleTag })
      audioCache.set(key, buffer)
    }

    res.set('Content-Type', 'audio/wav')
    res.send(buffer)
  } catch (err: any) {
    res.status(500).json({ error: err.message || '服务器内部错误' })
  }
})
```

- [ ] **步骤 4: 更新 GET `/tts`，共享缓存**

将 GET 路由处理体（第 89-122 行）替换为：

```typescript
router.get('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceId, styleMode, stylePrompt, styleTag, raw } = req.query as Record<string, string | undefined>

    if (!text || !text.trim()) {
      res.status(400).json({ error: '合成文本不能为空' })
      return
    }

    if (!config.apiKey) {
      res.status(500).json({ error: 'API Key 未配置，请在 server/.env 中设置 MIMO_API_KEY' })
      return
    }

    const key = makeCacheKey({ text, voiceId: voiceId || '冰糖', styleMode, stylePrompt, styleTag })
    let buffer = audioCache.get(key)

    if (!buffer) {
      buffer = await callMimoTts({
        text,
        voiceId: voiceId || '冰糖',
        styleMode: styleMode as 'natural' | 'tag' | undefined,
        stylePrompt,
        styleTag
      })
      audioCache.set(key, buffer)
    }

    res.set('Content-Type', 'audio/wav')
    if (raw === 'true') {
      res.set('Content-Disposition', 'inline; filename="tts-output.wav"')
    }
    res.send(buffer)
  } catch (err: any) {
    res.status(500).json({ error: err.message || '服务器内部错误' })
  }
})
```

注意：原 GET 处理有两个分支（非 raw 返回 JSON，raw 返回二进制）。现在统一返回二进制，`raw` 仅控制 `Content-Disposition` 头。

- [ ] **步骤 5: 提交**

```bash
git add server/src/routes/tts.ts
git commit -m "feat: return binary audio from TTS endpoints with LRU cache"
```

---

### 任务 3: 前端 `useTts.ts` — ArrayBuffer 消费

**文件：**
- 修改: `client/src/composables/useTts.ts`

- [ ] **步骤 1: 将 base64 替换为 ArrayBuffer**

将整个文件替换为：

```typescript
import { ref } from 'vue'
import type { TtsRequest } from '@/types'

export function useTts() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const audioBuffer = ref<ArrayBuffer | null>(null)

  async function generateTts(request: TtsRequest): Promise<void> {
    isLoading.value = true
    error.value = null
    audioBuffer.value = null

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (response.status === 401) {
        throw new Error('认证已过期，请重新验证')
      }

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error || `请求失败: ${response.status}`)
      }

      audioBuffer.value = await response.arrayBuffer()
    } catch (err: any) {
      error.value = err.message || '未知错误'
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, audioBuffer, generateTts }
}
```

- [ ] **步骤 2: 提交**

```bash
git add client/src/composables/useTts.ts
git commit -m "feat: consume audio as ArrayBuffer instead of base64"
```

---

### 任务 4: 前端 `AudioPlayer.vue` — 移除 base64 解码

**文件：**
- 修改: `client/src/components/AudioPlayer.vue`

- [ ] **步骤 1: 将 prop 从 `audioBase64` 改为 `audioBuffer`**

将：
```typescript
const props = defineProps<{
  audioBase64: string | null
}>()
```
替换为：
```typescript
const props = defineProps<{
  audioBuffer: ArrayBuffer | null
}>()
```

- [ ] **步骤 2: 替换 `decodeAudio` 函数**

将：
```typescript
async function decodeAudio(base64: string): Promise<AudioBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  audioContext = new AudioContext()
  return audioContext.decodeAudioData(bytes.buffer)
}
```
替换为：
```typescript
async function decodeAudio(buffer: ArrayBuffer): Promise<AudioBuffer> {
  audioContext = new AudioContext()
  return audioContext.decodeAudioData(buffer)
}
```

- [ ] **步骤 3: 替换 `downloadWav` 函数**

将：
```typescript
function downloadWav() {
  if (!props.audioBase64) return
  const binary = atob(props.audioBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'audio/wav' })
  ...
```
替换为：
```typescript
function downloadWav() {
  if (!props.audioBuffer) return
  const blob = new Blob([props.audioBuffer], { type: 'audio/wav' })
  ...
```

- [ ] **步骤 4: 更新 watch 监听 `audioBuffer`**

将：
```typescript
watch(() => props.audioBase64, async (newVal) => {
```
替换为：
```typescript
watch(() => props.audioBuffer, async (newVal) => {
```

- [ ] **步骤 5: 更新模板 `v-if`**

将：
```html
<div v-if="audioBase64" class="audio-player">
```
替换为：
```html
<div v-if="audioBuffer" class="audio-player">
```

- [ ] **步骤 6: 提交**

```bash
git add client/src/components/AudioPlayer.vue
git commit -m "feat: remove base64 decode, consume ArrayBuffer directly"
```

---

### 任务 5: 前端 `App.vue` + `types/index.ts` — 状态类型调整

**文件：**
- 修改: `client/src/App.vue`
- 修改: `client/src/types/index.ts`

- [ ] **步骤 1: 更新 `App.vue` 解构**

将第 18 行：
```typescript
const { isLoading, error, audioBase64, generateTts } = useTts()
```
替换为：
```typescript
const { isLoading, error, audioBuffer, generateTts } = useTts()
```

- [ ] **步骤 2: 更新模板中 `AudioPlayer` 的 prop 绑定**

找到：
```html
<AudioPlayer :audioBase64="audioBase64" />
```
替换为：
```html
<AudioPlayer :audioBuffer="audioBuffer" />
```

- [ ] **步骤 3: 从 types 中移除 `TtsResponse`**

在 `client/src/types/index.ts` 中，删除 `TtsResponse` 接口（第 20-23 行）：
```typescript
export interface TtsResponse {
  audioBase64: string
  format: 'wav'
}
```

- [ ] **步骤 4: 提交**

```bash
git add client/src/App.vue client/src/types/index.ts
git commit -m "feat: update App.vue state and remove unused TtsResponse type"
```

---

### 任务 6: 验证构建

- [ ] **步骤 1: 前端类型检查**

```bash
cd client && npx vue-tsc -b --noEmit
```
预期：无类型错误。

- [ ] **步骤 2: 前端构建**

```bash
cd client && npx vite build
```
预期：构建成功。

- [ ] **步骤 3: 服务端编译检查**

```bash
cd server && npx tsc --noEmit
```
预期：无类型错误。

- [ ] **步骤 4: 最终提交**

```bash
git add -A
git commit -m "chore: fix type issues from performance optimization"
```
