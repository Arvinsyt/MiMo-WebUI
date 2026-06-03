# MiMo V2.5 TTS WebUI 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 MiMo V2.5 TTS API 的个人语音合成 WebUI 工具，支持预置音色选择、风格控制和 WAV 音频播放下载。

**Architecture:** 前后端分离的 monorepo 结构。前端 Vue 3 + Vite + TS 负责 UI 交互，后端 Express + TS 代理 API 调用并管理 API Key。音频播放使用浏览器 Web Audio API，仅支持 WAV 格式。

**Tech Stack:** Vue 3, Vite, TypeScript, Express, dotenv, Web Audio API

---

## 文件结构总览

```
MiMo-WebUI/
├── package.json                          # 根 package.json（monorepo scripts）
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                              # MIMO_API_KEY
│   └── src/
│       ├── index.ts                      # Express 入口
│       ├── config.ts                     # 配置读取
│       └── routes/
│           └── tts.ts                    # POST /api/tts
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── types/
│       │   └── index.ts
│       ├── composables/
│       │   └── useTts.ts
│       └── components/
│           ├── VoiceSelector.vue
│           ├── StyleControl.vue
│           ├── TextInput.vue
│           ├── AudioPlayer.vue
│           └── GenerateButton.vue
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-05-30-mimo-tts-webui-design.md
        └── plans/
            └── 2026-05-30-mimo-tts-webui-plan.md
```

---

### Task 1: 项目脚手架搭建

**Files:**
- Create: `package.json`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`

- [ ] **Step 1: 创建根 package.json**

```json
{
  "name": "mimo-tts-webui",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "cd client && npm run build",
    "install:all": "npm install && cd server && npm install && cd ../client && npm install"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 2: 创建 server/package.json**

```json
{
  "name": "mimo-tts-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: 创建 server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 创建 server/.env**

```
MIMO_API_KEY=your_api_key_here
```

- [ ] **Step 5: 创建 client/package.json**

```json
{
  "name": "mimo-tts-client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vue-tsc": "^2.2.0"
  }
}
```

- [ ] **Step 6: 创建 client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "src/vite-env.d.ts"]
}
```

- [ ] **Step 7: 创建 client/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

- [ ] **Step 8: 创建 client/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MiMo TTS WebUI</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 9: 安装依赖并验证**

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

Expected: 所有依赖安装成功，无报错。

- [ ] **Step 10: 提交**

```bash
git add package.json server/ client/
git commit -m "chore: 项目脚手架搭建"
```

---

### Task 2: 后端 Express 服务器

**Files:**
- Create: `server/src/config.ts`
- Create: `server/src/routes/tts.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(import.meta.dirname, '../.env') })

export const config = {
  port: Number(process.env.PORT) || 3000,
  apiKey: process.env.MIMO_API_KEY || '',
  apiBase: 'https://api.xiaomimimo.com/v1'
}
```

- [ ] **Step 2: 创建 routes/tts.ts**

```typescript
import { Router, Request, Response } from 'express'
import { config } from '../config.js'

const router = Router()

interface TtsRequestBody {
  text: string
  voiceId: string
  styleMode: 'natural' | 'tag'
  stylePrompt: string
  styleTag: string
}

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

    // 组装 messages
    const messages: Array<{ role: string; content: string }> = []

    if (styleMode === 'natural' && stylePrompt) {
      messages.push({ role: 'user', content: stylePrompt })
    }

    if (styleMode === 'tag' && styleTag) {
      messages.push({ role: 'assistant', content: `(${styleTag})${text}` })
    } else {
      messages.push({ role: 'assistant', content: text })
    }

    // 请求 MiMo API
    const response = await fetch(`${config.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey
      },
      body: JSON.stringify({
        model: 'mimo-v2.5-tts',
        messages,
        audio: {
          format: 'wav',
          voice: voiceId
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      res.status(response.status).json({ error: `MiMo API 错误: ${errorText}` })
      return
    }

    const data = await response.json() as any
    const audioBase64 = data.choices?.[0]?.message?.audio?.data

    if (!audioBase64) {
      res.status(500).json({ error: '未收到音频数据' })
      return
    }

    res.json({ audioBase64, format: 'wav' })
  } catch (err: any) {
    res.status(500).json({ error: err.message || '服务器内部错误' })
  }
})

export default router
```

- [ ] **Step 3: 创建 index.ts**

```typescript
import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import ttsRouter from './routes/tts.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api', ttsRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', apiKeyConfigured: !!config.apiKey })
})

app.listen(config.port, () => {
  console.log(`服务器已启动: http://localhost:${config.port}`)
  console.log(`API Key 已配置: ${!!config.apiKey}`)
})
```

- [ ] **Step 4: 启动后端验证**

```bash
cd server && npm run dev
```

Expected: 控制台输出 "服务器已启动: http://localhost:3000" 和 "API Key 已配置: true"

- [ ] **Step 5: 测试健康检查**

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok","apiKeyConfigured":true}`

- [ ] **Step 6: 提交**

```bash
git add server/src/
git commit -m "feat: 后端 Express 服务器和 TTS 代理路由"
```

---

### Task 3: 前端类型定义和 composable

**Files:**
- Create: `client/src/vite-env.d.ts`
- Create: `client/src/types/index.ts`
- Create: `client/src/composables/useTts.ts`
- Create: `client/src/main.ts`

- [ ] **Step 1: 创建 vite-env.d.ts**

```typescript
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

- [ ] **Step 2: 创建 types/index.ts**

```typescript
export interface VoicePreset {
  id: string
  voiceId: string
  label: string
  gender: 'female' | 'male'
  language: 'zh' | 'en'
  emoji: string
}

export type StyleMode = 'natural' | 'tag'

export interface TtsRequest {
  text: string
  voiceId: string
  styleMode: StyleMode
  stylePrompt: string
  styleTag: string
}

export interface TtsResponse {
  audioBase64: string
  format: 'wav'
}

export const VOICE_PRESETS: VoicePreset[] = [
  { id: '冰糖', voiceId: '冰糖', label: '冰糖', gender: 'female', language: 'zh', emoji: '🧊' },
  { id: '茉莉', voiceId: '茉莉', label: '茉莉', gender: 'female', language: 'zh', emoji: '🌸' },
  { id: '苏打', voiceId: '苏打', label: '苏打', gender: 'male', language: 'zh', emoji: '🥤' },
  { id: '白桦', voiceId: '白桦', label: '白桦', gender: 'male', language: 'zh', emoji: '🌲' },
  { id: 'Mia', voiceId: 'Mia', label: 'Mia', gender: 'female', language: 'en', emoji: '👩' },
  { id: 'Chloe', voiceId: 'Chloe', label: 'Chloe', gender: 'female', language: 'en', emoji: '👩' },
  { id: 'Milo', voiceId: 'Milo', label: 'Milo', gender: 'male', language: 'en', emoji: '👦' },
  { id: 'Dean', voiceId: 'Dean', label: 'Dean', gender: 'male', language: 'en', emoji: '👨' }
]
```

- [ ] **Step 3: 创建 composables/useTts.ts**

```typescript
import { ref } from 'vue'
import type { TtsRequest, TtsResponse } from '@/types'

export function useTts() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const audioBase64 = ref<string | null>(null)

  async function generateTts(request: TtsRequest): Promise<void> {
    isLoading.value = true
    error.value = null
    audioBase64.value = null

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error || `请求失败: ${response.status}`)
      }

      const data = await response.json() as TtsResponse
      audioBase64.value = data.audioBase64
    } catch (err: any) {
      error.value = err.message || '未知错误'
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, audioBase64, generateTts }
}
```

- [ ] **Step 4: 创建 main.ts**

```typescript
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 5: 提交**

```bash
git add client/src/
git commit -m "feat: 前端类型定义和 TTS composable"
```

---

### Task 4: VoiceSelector 组件

**Files:**
- Create: `client/src/components/VoiceSelector.vue`

- [ ] **Step 1: 创建 VoiceSelector.vue**

```vue
<script setup lang="ts">
import { VOICE_PRESETS, type VoicePreset } from '@/types'

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function selectVoice(voice: VoicePreset) {
  emit('update:modelValue', voice.voiceId)
}
</script>

<template>
  <div class="voice-selector">
    <label class="label">预置音色</label>
    <div class="voice-grid">
      <button
        v-for="voice in VOICE_PRESETS"
        :key="voice.id"
        :class="['voice-item', { active: modelValue === voice.voiceId }]"
        @click="selectVoice(voice)"
      >
        <span class="voice-emoji">{{ voice.emoji }}</span>
        <span class="voice-name">{{ voice.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.voice-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.voice-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.voice-item:hover {
  border-color: #2196f3;
  background: #f0f7ff;
}

.voice-item.active {
  background: #e3f2fd;
  border: 2px solid #2196f3;
}

.voice-emoji {
  font-size: 16px;
}

.voice-name {
  font-weight: 500;
}
</style>
```

- [ ] **Step 2: 验证组件无语法错误**

```bash
cd client && npx vue-tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 3: 提交**

```bash
git add client/src/components/VoiceSelector.vue
git commit -m "feat: 预置音色选择器组件"
```

---

### Task 5: StyleControl 组件

**Files:**
- Create: `client/src/components/StyleControl.vue`

- [ ] **Step 1: 创建 StyleControl.vue**

```vue
<script setup lang="ts">
import type { StyleMode } from '@/types'

defineProps<{
  mode: StyleMode
  stylePrompt: string
  styleTag: string
}>()

const emit = defineEmits<{
  'update:mode': [value: StyleMode]
  'update:stylePrompt': [value: string]
  'update:styleTag': [value: string]
}>()

const TAG_EXAMPLES = [
  '开心', '悲伤', '愤怒', '温柔', '高冷', '慵懒',
  '磁性', '清亮', '稚嫩', '东北话', '粤语', '唱歌'
]
</script>

<template>
  <div class="style-control">
    <label class="label">风格控制模式</label>
    <div class="mode-switch">
      <button
        :class="['mode-btn', { active: mode === 'natural' }]"
        @click="emit('update:mode', 'natural')"
      >
        自然语言
      </button>
      <button
        :class="['mode-btn', { active: mode === 'tag' }]"
        @click="emit('update:mode', 'tag')"
      >
        音频标签
      </button>
    </div>

    <div v-if="mode === 'natural'" class="style-input">
      <label class="label">风格指令</label>
      <textarea
        :value="stylePrompt"
        @input="emit('update:stylePrompt', ($event.target as HTMLTextAreaElement).value)"
        placeholder="用轻快上扬的语调..."
        rows="4"
      />
      <p class="hint">支持导演模式：角色、场景、指导三维度描述</p>
    </div>

    <div v-else class="style-input">
      <label class="label">风格标签</label>
      <input
        :value="styleTag"
        @input="emit('update:styleTag', ($event.target as HTMLInputElement).value)"
        placeholder="输入标签，如：开心"
        type="text"
      />
      <div class="tag-presets">
        <button
          v-for="tag in TAG_EXAMPLES"
          :key="tag"
          class="tag-preset"
          @click="emit('update:styleTag', tag)"
        >
          {{ tag }}
        </button>
      </div>
      <p class="hint">标签将自动包裹为 (标签)文本内容 的格式</p>
    </div>
  </div>
</template>

<style scoped>
.label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mode-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.mode-btn {
  flex: 1;
  padding: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.mode-btn:hover {
  border-color: #2196f3;
}

.mode-btn.active {
  background: #e3f2fd;
  border: 2px solid #2196f3;
}

.style-input textarea,
.style-input input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
}

.style-input textarea:focus,
.style-input input:focus {
  outline: none;
  border-color: #2196f3;
}

.tag-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.tag-preset {
  padding: 4px 10px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.tag-preset:hover {
  background: #e3f2fd;
  border-color: #2196f3;
}

.hint {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}
</style>
```

- [ ] **Step 2: 验证组件无语法错误**

```bash
cd client && npx vue-tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 3: 提交**

```bash
git add client/src/components/StyleControl.vue
git commit -m "feat: 风格控制组件（自然语言 + 音频标签）"
```

---

### Task 6: TextInput 组件

**Files:**
- Create: `client/src/components/TextInput.vue`

- [ ] **Step 1: 创建 TextInput.vue**

```vue
<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="text-input">
    <label class="label">合成文本</label>
    <textarea
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      placeholder="在此输入要合成的文字内容..."
      rows="6"
    />
    <div class="char-count">{{ modelValue.length }} 字</div>
  </div>
</template>

<style scoped>
.label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  min-height: 120px;
}

textarea:focus {
  outline: none;
  border-color: #2196f3;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
```

- [ ] **Step 2: 验证组件无语法错误**

```bash
cd client && npx vue-tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 3: 提交**

```bash
git add client/src/components/TextInput.vue
git commit -m "feat: 文本输入组件"
```

---

### Task 7: AudioPlayer 组件

**Files:**
- Create: `client/src/components/AudioPlayer.vue`

- [ ] **Step 1: 创建 AudioPlayer.vue**

```vue
<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  audioBase64: string | null
}>()

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progress = ref(0)

let audioContext: AudioContext | null = null
let sourceNode: AudioBufferSourceNode | null = null
let audioBuffer: AudioBuffer | null = null
let startTime = 0
let pauseTime = 0

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function decodeAudio(base64: string): Promise<AudioBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  audioContext = new AudioContext()
  return audioContext.decodeAudioData(bytes.buffer)
}

async function play() {
  if (!audioBuffer) return

  if (!audioContext) {
    audioContext = new AudioContext()
  }

  sourceNode = audioContext.createBufferSource()
  sourceNode.buffer = audioBuffer
  sourceNode.connect(audioContext.destination)

  sourceNode.onended = () => {
    isPlaying.value = false
    currentTime.value = 0
    progress.value = 0
    pauseTime = 0
  }

  startTime = audioContext.currentTime - pauseTime
  sourceNode.start(0, pauseTime)
  isPlaying.value = true
  updateProgress()
}

function pause() {
  if (!sourceNode || !audioContext) return
  sourceNode.stop()
  pauseTime = audioContext.currentTime - startTime
  currentTime.value = pauseTime
  progress.value = (pauseTime / duration.value) * 100
  isPlaying.value = false
}

function togglePlay() {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}

function updateProgress() {
  if (!isPlaying.value || !audioContext) return
  currentTime.value = audioContext.currentTime - startTime
  progress.value = (currentTime.value / duration.value) * 100
  if (isPlaying.value) {
    requestAnimationFrame(updateProgress)
  }
}

function downloadWav() {
  if (!audioBase64) return
  const binary = atob(audioBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mimo_tts_${Date.now()}.wav`
  a.click()
  URL.revokeObjectURL(url)
}

watch(() => props.audioBase64, async (newVal) => {
  if (newVal) {
    audioBuffer = await decodeAudio(newVal)
    duration.value = audioBuffer.duration
    currentTime.value = 0
    progress.value = 0
    pauseTime = 0
    isPlaying.value = false
  }
})

onUnmounted(() => {
  if (audioContext) {
    audioContext.close()
  }
})
</script>

<template>
  <div v-if="audioBase64" class="audio-player">
    <div class="player-controls">
      <button class="play-btn" @click="togglePlay">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <div class="progress-bar" @click="(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const ratio = (e.clientX - rect.left) / rect.width
        pauseTime = ratio * duration
        currentTime.value = pauseTime
        progress = ratio * 100
        if (isPlaying) {
          sourceNode?.stop()
          play()
        }
      }">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <span class="time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
    </div>
    <button class="download-btn" @click="downloadWav">
      ⬇ 下载 WAV
    </button>
  </div>
</template>

<style scoped>
.audio-player {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.play-btn {
  width: 40px;
  height: 40px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.play-btn:hover {
  background: #1976d2;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #ddd;
  border-radius: 3px;
  cursor: pointer;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2196f3;
  border-radius: 3px;
  transition: width 0.1s;
}

.time {
  font-size: 12px;
  color: #666;
  flex-shrink: 0;
}

.download-btn {
  margin-top: 12px;
  padding: 6px 14px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.download-btn:hover {
  border-color: #2196f3;
  color: #2196f3;
}
</style>
```

- [ ] **Step 2: 验证组件无语法错误**

```bash
cd client && npx vue-tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 3: 提交**

```bash
git add client/src/components/AudioPlayer.vue
git commit -m "feat: 音频播放器组件（播放/暂停/进度/下载）"
```

---

### Task 8: App.vue 主界面集成

**Files:**
- Create: `client/src/App.vue`

- [ ] **Step 1: 创建 App.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import VoiceSelector from './components/VoiceSelector.vue'
import StyleControl from './components/StyleControl.vue'
import TextInput from './components/TextInput.vue'
import AudioPlayer from './components/AudioPlayer.vue'
import { useTts } from './composables/useTts'
import type { StyleMode } from './types'

const voiceId = ref('冰糖')
const styleMode = ref<StyleMode>('natural')
const stylePrompt = ref('')
const styleTag = ref('')
const text = ref('')

const { isLoading, error, audioBase64, generateTts } = useTts()

async function handleGenerate() {
  await generateTts({
    text: text.value,
    voiceId: voiceId.value,
    styleMode: styleMode.value,
    stylePrompt: stylePrompt.value,
    styleTag: styleTag.value
  })
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>MiMo V2.5 TTS</h1>
      <p class="subtitle">语音合成工具</p>
    </header>

    <main class="main">
      <aside class="sidebar">
        <VoiceSelector v-model="voiceId" />
        <StyleControl
          v-model:mode="styleMode"
          v-model:stylePrompt="stylePrompt"
          v-model:styleTag="styleTag"
        />
      </aside>

      <section class="content">
        <TextInput v-model="text" />

        <button
          class="generate-btn"
          :disabled="isLoading || !text.trim()"
          @click="handleGenerate"
        >
          {{ isLoading ? '生成中...' : '🎙️ 生成语音' }}
        </button>

        <div v-if="error" class="error">{{ error }}</div>

        <AudioPlayer :audio-base64="audioBase64" />
      </section>
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #fff;
  color: #333;
}

.app {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 24px;
}

.header h1 {
  font-size: 24px;
  font-weight: 700;
}

.subtitle {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.main {
  display: flex;
  gap: 24px;
}

.sidebar {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.generate-btn {
  padding: 12px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.generate-btn:hover:not(:disabled) {
  background: #1976d2;
}

.generate-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  padding: 10px 14px;
  background: #ffebee;
  color: #c62828;
  border-radius: 6px;
  font-size: 13px;
}
</style>
```

- [ ] **Step 2: 验证全项目类型检查**

```bash
cd client && npx vue-tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 3: 启动开发服务器验证**

```bash
cd .. && npm run dev
```

Expected: 前端在 http://localhost:5173 可访问，后端在 http://localhost:3000 可访问

- [ ] **Step 4: 提交**

```bash
git add client/src/App.vue
git commit -m "feat: App.vue 主界面集成"
```

---

### Task 9: 最终验证和清理

**Files:**
- Modify: `.gitignore` (if needed)

- [ ] **Step 1: 创建 .gitignore**

```
node_modules/
dist/
.env
.superpowers/
```

- [ ] **Step 2: 端到端测试**

1. 打开 http://localhost:5173
2. 选择一个音色（如冰糖）
3. 输入风格指令（如 "温柔地"）
4. 输入合成文本（如 "你好，今天天气真好"）
5. 点击"生成语音"
6. 验证播放器出现，能播放和下载

- [ ] **Step 3: 提交**

```bash
git add .gitignore
git commit -m "chore: 添加 .gitignore，项目完成"
```
