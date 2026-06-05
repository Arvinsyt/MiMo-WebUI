<script lang="ts">
const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav']
const MAX_BASE64_BYTES = 10 * 1024 * 1024
</script>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

defineProps<{
  voiceBase64?: string | null
  hasFile?: boolean
}>()

const emit = defineEmits<{
  'update:voiceBase64': [value: string | null]
  'update:hasFile': [value: boolean]
}>()

const selectedFile = ref<File | null>(null)
const isDragover = ref(false)
const errorMsg = ref('')
const audioUrl = ref<string | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)

let currentFile: File | null = null

function validateFile(file: File): boolean {
  errorMsg.value = ''

  if (!ALLOWED_TYPES.some(t => file.type === t || file.name.endsWith('.mp3') || file.name.endsWith(t.replace('audio/', '.')))) {
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
  currentFile = file

  selectedFile.value = file

  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  audioUrl.value = URL.createObjectURL(file)

  const reader = new FileReader()
  reader.onload = () => {
    if (currentFile !== file) return
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
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.src = ''
  }
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

onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})
</script>

<template>
  <div class="voice-clone-upload">
    <div
      v-if="!selectedFile"
      :class="['drop-zone', { dragover: isDragover }]"
      @dragenter.prevent="onDragOver"
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
