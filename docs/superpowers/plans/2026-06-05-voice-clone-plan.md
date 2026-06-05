# 音色复刻功能 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 添加音色复刻（Voice Clone）模式，支持上传音频样本复刻音色后合成语音。

**Architecture:** 前端通过 Tab 切换预置音色/音色复刻模式。复刻模式下显示文件上传组件，音频以 Base64 data URI 形式传递给后端，后端透传至 MiMo API (`mimo-v2.5-tts-voiceclone` 模型)。与现有预置音色模式共用风格控制和音频播放。

**Tech Stack:** Vue 3 + TypeScript (前端), Express + TypeScript (后端), 与现有项目技术栈一致。

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `client/src/types/index.ts` | 修改 | 扩展 TtsRequest 增加 voiceBase64 字段 |
| `client/src/components/VoiceCloneUpload.vue` | **新建** | 音频上传、预览播放、校验 |
| `client/src/components/VoiceSelector.vue` | 修改 | 新增预置音色/音色复刻 Tab 切换 |
| `client/src/composables/useTts.ts` | 修改 | 请求体增加 voiceBase64 |
| `client/src/App.vue` | 修改 | 管理 cloneMode 状态，传递给子组件 |
| `server/src/routes/tts.ts` | 修改 | 检测 voiceBase64，切换模型和 audio.voice |
| `server/src/cache.ts` | 修改 | 缓存 key 增加 voiceBase64Sha256 维度 |

---

### Task 1: 扩展类型定义

**Files:**
- Modify: `client/src/types/index.ts`

- [ ] **Step 1: 修改 TtsRequest 接口，voiceId 改为可选，新增 voiceBase64**

```typescript
export interface TtsRequest {
  text: string
  voiceId?: string
  voiceBase64?: string
  styleMode: StyleMode
  stylePrompt: string
  styleTag: string
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx vue-tsc --noEmit --project client/tsconfig.json`
Expected: 应有预先存在的 App.vue 类型错误（voiceId 必填但现在可选），后续任务修复

- [ ] **Step 3: Commit**

```bash
git add client/src/types/index.ts
git commit -m "feat(types): make voiceId optional, add voiceBase64 to TtsRequest"
```

---

### Task 2: 创建 VoiceCloneUpload 组件

**Files:**
- Create: `client/src/components/VoiceCloneUpload.vue`

- [ ] **Step 1: 创建组件文件**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

const emit = defineEmits<{
  'update:voiceBase64': [value: string | null]
  'update:hasFile': [value: boolean]
}>()

const selectedFile = ref<File | null>(null)
const isDragover = ref(false)
const errorMsg = ref('')
const audioUrl = ref<string | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)

const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav']
const MAX_BASE64_BYTES = 10 * 1024 * 1024 // 10 MB

function validateFile(file: File): boolean {
  errorMsg.value = ''

  if (!ALLOWED_TYPES.some(t => file.type === t || file.name.endsWith(t.replace('audio/', '.')))) {
    errorMsg.value = '仅支持 mp3、wav 格式的音频文件'
    return false
  }

  const estimatedBase64Size = Math.ceil(file.size * 4 / 3)
  if (estimatedBase64Size > MAX_BASE64_BYTES) {
    errorMsg.value = '音频文件过大，Base64 编码后将超过 10MB，请使用小于 7.5MB 的文件'
    return false
  }

  return true
}

function processFile(file: File) {
  if (!validateFile(file)) return

  selectedFile.value = file

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  audioUrl.value = URL.createObjectURL(file)

  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result as string
    emit('update:voiceBase64', result)
    emit('update:hasFile', true)
  }
  reader.onerror = () => {
    errorMsg.value = '文件读取失败，请重试'
    clearFile()
  }
  reader.readAsDataURL(file)
}

function clearFile() {
  selectedFile.value = null
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = null
  }
  errorMsg.value = ''
  emit('update:voiceBase64', null)
  emit('update:hasFile', false)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragover.value = true
}

function onDragLeave() {
  isDragover.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragover.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) processFile(file)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function triggerFileInput() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.mp3,.wav,audio/mpeg,audio/wav'
  input.onchange = onFileInput
  input.click()
}

function togglePlay() {
  if (!audioRef.value) return
  if (audioRef.value.paused) {
    audioRef.value.play()
  } else {
    audioRef.value.pause()
  }
}
</script>

<template>
  <div class="voice-clone-upload">
    <div
      v-if="!selectedFile"
      :class="['drop-zone', { dragover: isDragover }]"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="triggerFileInput"
    >
      <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 16V4M8 8l4-4 4 4" />
        <path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
      </svg>
      <p class="upload-text">拖拽或点击上传音频样本</p>
      <p class="upload-hint">支持 mp3、wav 格式，Base64 后不超过 10MB</p>
    </div>

    <div v-else class="file-info">
      <div class="file-details">
        <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <div class="file-meta">
          <span class="file-name">{{ selectedFile.name }}</span>
          <span class="file-size">{{ formatSize(selectedFile.size) }}</span>
        </div>
      </div>
      <div class="file-actions">
        <button class="action-btn play-btn" @click.stop="togglePlay" title="预览播放">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 3.5v9l7-4.5-7-4.5Z" />
          </svg>
        </button>
        <button class="action-btn remove-btn" @click.stop="clearFile" title="移除">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M5 5l6 6M11 5l-6 6" />
          </svg>
        </button>
      </div>
      <audio v-if="audioUrl" ref="audioRef" :src="audioUrl" preload="metadata" class="hidden-audio" />
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
  </div>
</template>

<style scoped>
.voice-clone-upload {
  padding: 0 12px;
  font-family: var(--font-body, 'Noto Sans SC', sans-serif);
}

.drop-zone {
  border: 2px dashed var(--color-border, #ede4dc);
  border-radius: 10px;
  padding: 28px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.drop-zone:hover,
.drop-zone.dragover {
  border-color: var(--color-primary, #d4a574);
  background: var(--color-primary-subtle, rgba(212, 165, 116, 0.06));
}

.upload-icon {
  width: 32px;
  height: 32px;
  color: var(--color-text-hint, #b5a89c);
  margin-bottom: 10px;
}

.drop-zone:hover .upload-icon,
.drop-zone.dragover .upload-icon {
  color: var(--color-primary, #d4a574);
}

.upload-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #8b7d72);
  margin: 0 0 4px;
}

.upload-hint {
  font-size: 11px;
  color: var(--color-text-hint, #b5a89c);
  margin: 0;
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--color-surface, #ffffff);
  border: 1.5px solid var(--color-border, #ede4dc);
  border-radius: 10px;
}

.file-details {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.file-icon {
  width: 20px;
  height: 20px;
  color: var(--color-primary, #d4a574);
  flex-shrink: 0;
}

.file-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text, #2d2420);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 11px;
  color: var(--color-text-hint, #b5a89c);
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--color-border-light, #ede4dc);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

.play-btn {
  color: var(--color-primary, #d4a574);
}

.play-btn:hover {
  background: var(--color-primary-subtle, rgba(212, 165, 116, 0.1));
}

.remove-btn {
  color: var(--color-text-hint, #b5a89c);
}

.remove-btn:hover {
  color: #c0392b;
  border-color: #f5c6cb;
  background: #fdf0ed;
}

.hidden-audio {
  display: none;
}

.error-msg {
  margin: 8px 0 0;
  font-size: 11px;
  color: #c0392b;
  line-height: 1.4;
}
</style>
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx vue-tsc --noEmit --project client/tsconfig.json`
Expected: 新组件无类型错误（App.vue 的预先存在错误除外）

- [ ] **Step 3: Commit**

```bash
git add client/src/components/VoiceCloneUpload.vue
git commit -m "feat: add VoiceCloneUpload component with drag-drop and preview"
```

---

### Task 3: VoiceSelector 添加 Tab 切换

**Files:**
- Modify: `client/src/components/VoiceSelector.vue`

- [ ] **Step 1: 添加 Tab 栏和克隆模式支持**

修改 `VoiceSelector.vue` 的 `<script setup>` 区块，替换为：

```typescript
import { VOICE_PRESETS, type VoicePreset } from '@/types'

defineProps<{
  modelValue: string
  cloneMode: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:cloneMode': [value: boolean]
}>()

function selectVoice(voice: VoicePreset) {
  emit('update:modelValue', voice.voiceId)
}

function setCloneMode(value: boolean) {
  emit('update:cloneMode', value)
}
```

修改 `<template>`，在 `.voice-selector` 根 div 内、`.voice-grid` 之前插入 Tab 栏，`.voice-grid` 添加 `v-if="!cloneMode"`：

```html
<template>
  <div class="voice-selector">
    <div class="mode-tabs">
      <button
        :class="['mode-tab', { active: !cloneMode }]"
        @click="setCloneMode(false)"
      >
        预置音色
      </button>
      <button
        :class="['mode-tab', { active: cloneMode }]"
        @click="setCloneMode(true)"
      >
        音色复刻
      </button>
    </div>
    <div class="voice-grid" v-if="!cloneMode">
      <button
        v-for="voice in VOICE_PRESETS"
        :key="voice.id"
        :class="['voice-item', { selected: modelValue === voice.voiceId }]"
        @click="selectVoice(voice)"
      >
        <span class="voice-emoji">{{ voice.emoji }}</span>
        <div class="voice-info">
          <span class="voice-name">{{ voice.label }}</span>
          <span class="voice-meta">{{ voice.gender === 'female' ? '女声' : '男声' }} · {{ voice.language === 'zh' ? '中文' : '英文' }}</span>
        </div>
      </button>
    </div>
  </div>
</template>
```

在 `<style scoped>` 末尾追加 Tab 样式（保留原有所有样式）：

```css
.mode-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  padding: 0 12px;
}

.mode-tab {
  flex: 1;
  padding: 8px 12px;
  background: transparent;
  border: 1.5px solid var(--color-border-light, #ede4dc);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #8b7d72);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: var(--font-body, 'Noto Sans SC', sans-serif);
}

.mode-tab:hover {
  border-color: var(--color-primary, #d4a574);
  color: var(--color-primary-dark, #b8845c);
  background: var(--color-primary-subtle, rgba(212, 165, 116, 0.06));
}

.mode-tab.active {
  background: var(--color-primary, #d4a574);
  border-color: var(--color-primary, #d4a574);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(212, 165, 116, 0.25);
}
```

注意：现有的 `.voice-selector` 规则中有 `padding: 0 12px;`，Tab 栏内部也有 `padding: 0 12px;`，因为 `.voice-grid` 原本依赖父级的 padding。去掉 `.voice-selector` 的 padding，让内部元素自行控制间距。修改 `.voice-selector` 样式：

```css
.voice-selector {
  /* padding: 0 12px;  ← 移除这行 */
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx vue-tsc --noEmit --project client/tsconfig.json`
Expected: VoiceSelector 无新错误

- [ ] **Step 3: Commit**

```bash
git add client/src/components/VoiceSelector.vue
git commit -m "feat(voice-selector): add preset/clone mode tab switching"
```

---

### Task 4: 更新 useTts composable

**Files:**
- Modify: `client/src/composables/useTts.ts`

- [ ] **Step 1: 不做代码修改，仅确认 useTts.ts 无需改动**

`useTts.ts` 直接透传 `TtsRequest` 到 fetch body，`TtsRequest` 已在 Task 1 中添加了 `voiceBase64` 字段，无需额外修改。

- [ ] **Step 2: 验证**

Run: `npx vue-tsc --noEmit --project client/tsconfig.json`
Expected: 无 useTts 相关新错误

- [ ] **Step 3: Commit**（如无改动则跳过）

无需 commit，useTts.ts 未做修改。

---

### Task 5: App.vue 集成声纹复刻模式

**Files:**
- Modify: `client/src/App.vue`

- [ ] **Step 1: 添加状态和导入**

修改 `<script setup>`，替换为：

```typescript
import { ref, onMounted, computed } from 'vue'
import VoiceSelector from './components/VoiceSelector.vue'
import StyleControl from './components/StyleControl.vue'
import TextInput from './components/TextInput.vue'
import AudioPlayer from './components/AudioPlayer.vue'
import VoiceCloneUpload from './components/VoiceCloneUpload.vue'
import { useTts } from './composables/useTts'
import type { StyleMode } from './types'
import AuthGate from './components/AuthGate.vue'
import { useAuth } from './composables/useAuth'
import ToastContainer from './components/ToastContainer.vue'

const voiceId = ref('冰糖')
const cloneMode = ref(false)
const voiceBase64 = ref<string | null>(null)
const hasVoiceFile = ref(false)
const styleMode = ref<StyleMode>('natural')
const stylePrompt = ref('')
const styleTag = ref('')
const text = ref('')

const { isLoading, audioBuffer, generateTts } = useTts()

const { isAuthenticated, checkAuth, logout } = useAuth()

const canGenerate = computed(() => {
  if (!text.value.trim()) return false
  if (cloneMode.value && !hasVoiceFile.value) return false
  return true
})

async function handleGenerate() {
  await generateTts({
    text: text.value,
    voiceId: cloneMode.value ? undefined : voiceId.value,
    voiceBase64: cloneMode.value ? voiceBase64.value ?? undefined : undefined,
    styleMode: styleMode.value,
    stylePrompt: stylePrompt.value,
    styleTag: styleTag.value
  })
}

onMounted(() => {
  checkAuth()
})

function onAuthenticated() {
}
```

- [ ] **Step 2: 修改模板 — VoiceSelector 绑定和 VoiceCloneUpload 条件渲染**

修改模板中 `<VoiceSelector>` 绑定和附近的 sidebar 结构：

```html
<aside class="sidebar">
  <div class="sidebar-section">
    <div class="section-header">
      <svg class="section-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.93 3.93l1.41 1.41M14.66 14.66l1.41 1.41M3.93 16.07l1.41-1.41M14.66 5.34l1.41-1.41" />
      </svg>
      <h2 class="section-label">选择音色</h2>
    </div>
    <VoiceSelector v-model="voiceId" v-model:cloneMode="cloneMode" />
    <VoiceCloneUpload
      v-if="cloneMode"
      v-model:voiceBase64="voiceBase64"
      v-model:hasFile="hasVoiceFile"
    />
  </div>
```

- [ ] **Step 3: 修改生成按钮的 disabled 条件**

将原有：

```html
:disabled="isLoading || !text.trim()"
```

替换为：

```html
:disabled="isLoading || !canGenerate"
```

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `npx vue-tsc --noEmit --project client/tsconfig.json`
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add client/src/App.vue
git commit -m "feat(app): integrate voice clone mode with upload and model switching"
```

---

### Task 6: 后端 TTS 路由支持音色复刻

**Files:**
- Modify: `server/src/routes/tts.ts`

- [ ] **Step 1: 修改 TtsParams 和 TtsRequestOptions 类型，新增 voiceBase64 参数**

修改 `TtsParams` 接口（约第 5 行），新增 `voiceBase64` 字段：

```typescript
interface TtsParams {
  text: string
  voiceId: string
  voiceBase64?: string
  styleMode?: 'natural' | 'tag'
  stylePrompt?: string
  styleTag?: string
}
```

修改 `TtsRequestOptions` 接口（约第 58 行），新增 `voiceBase64`：

```typescript
interface TtsRequestOptions {
  text: string
  voiceId?: string
  voiceBase64?: string
  styleMode?: string
  stylePrompt?: string
  styleTag?: string
  raw?: string
}
```

- [ ] **Step 2: 修改 callMimoTts 函数，根据 voiceBase64 决定模型和 audio.voice**

修改 `callMimoTts` 函数体（约第 13-56 行），替换为：

```typescript
async function callMimoTts(params: TtsParams): Promise<Buffer> {
  const { text, voiceId, voiceBase64, styleMode, stylePrompt, styleTag } = params
  const isCloneMode = !!voiceBase64

  const messages: Array<{ role: string; content: string }> = []

  if (styleMode === 'natural' && stylePrompt) {
    messages.push({ role: 'user', content: stylePrompt })
    messages.push({ role: 'assistant', content: text })
  } else if (styleMode === 'tag' && styleTag) {
    messages.push({ role: 'assistant', content: `(${styleTag})${text}` })
  } else {
    messages.push({ role: 'assistant', content: text })
  }

  const response = await fetch(`${config.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey
    },
    body: JSON.stringify({
      model: isCloneMode ? 'mimo-v2.5-tts-voiceclone' : 'mimo-v2.5-tts',
      messages,
      audio: {
        format: 'wav',
        voice: isCloneMode ? voiceBase64 : voiceId
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`MiMo API 错误: ${errorText}`)
  }

  const data = await response.json() as any
  const audioBase64 = data.choices?.[0]?.message?.audio?.data

  if (!audioBase64) {
    throw new Error('未收到音频数据')
  }

  return Buffer.from(audioBase64, 'base64')
}
```

- [ ] **Step 3: 修改 handleTtsRequest 函数，传递 voiceBase64 到 params**

修改 `handleTtsRequest` 中的 params 构造（约第 80-86 行），增加 `voiceBase64`：

```typescript
const params: TtsParams = {
  text,
  voiceId: voiceId || '冰糖',
  voiceBase64,
  styleMode: styleMode as 'natural' | 'tag' | undefined,
  stylePrompt,
  styleTag,
}
```

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `npx tsc --noEmit --project server/tsconfig.json`
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/tts.ts
git commit -m "feat(server): support mimo-v2.5-tts-voiceclone model for voice clone"
```

---

### Task 7: 缓存 Key 支持音色复刻

**Files:**
- Modify: `server/src/cache.ts`

- [ ] **Step 1: 修改 CacheKeyParams 接口和 makeCacheKey 函数**

修改 `CacheKeyParams` 接口（约第 42 行），新增 `voiceBase64`：

```typescript
interface CacheKeyParams {
  text: string
  voiceId: string
  voiceBase64?: string
  styleMode?: string
  stylePrompt?: string
  styleTag?: string
}
```

修改 `makeCacheKey` 函数（约第 50 行），替换为：

```typescript
export function makeCacheKey(params: CacheKeyParams): string {
  const voiceBase64Hash = params.voiceBase64
    ? createHash('sha256').update(params.voiceBase64).digest('hex').slice(0, 16)
    : ''
  const raw = `${params.text}|${params.voiceId}|${voiceBase64Hash}|${params.styleMode ?? ''}|${params.stylePrompt ?? ''}|${params.styleTag ?? ''}`
  return createHash('sha256').update(raw).digest('hex')
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit --project server/tsconfig.json`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add server/src/cache.ts
git commit -m "feat(cache): include voiceBase64 hash in cache key for clone mode"
```

---

### Task 8: 端到端验证

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev`
Expected: 服务端在 port 3000 启动，客户端在 port 10086 启动，无编译错误

- [ ] **Step 2: 验证预置音色模式功能未受影响**

- 打开浏览器访问 `http://localhost:10086`
- 默认应显示"预置音色" Tab 为选中状态
- 选择音色 → 输入文本 → 点击生成语音
- 验证音频正常播放和下载

- [ ] **Step 3: 验证音色复刻模式**

- 切换到"音色复刻" Tab
- 上传一个 mp3 或 wav 音频文件
- 确认文件信息显示正确，可预览播放
- 输入合成文本 → 点击生成语音
- 验证音频正常生成、播放和下载

- [ ] **Step 4: 验证校验逻辑**

- 尝试上传非音频文件（如 .txt），确认被拒绝并提示
- 尝试上传超过 7.5MB 的音频文件，确认被拒绝并提示
- 在复刻模式下未上传文件时，生成按钮应为 disabled 状态

- [ ] **Step 5: Commit**（如有修复）

---

### Task 9: 构建验证

- [ ] **Step 1: 构建前端**

Run: `npx vite build --config client/vite.config.ts`
Workdir: `/home/Code/MiMo-WebUI`
Expected: 构建成功，输出到 `client/dist/`

- [ ] **Step 2: 编译后端**

Run: `npx tsc --project server/tsconfig.json`
Workdir: `/home/Code/MiMo-WebUI`
Expected: 编译成功，输出到 `server/dist/`
