<script lang="ts">
// 允许的音频 MIME 类型
const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav']
// Base64 编码后最大字节数限制（10MB）
const MAX_BASE64_BYTES = 10 * 1024 * 1024
</script>

<script setup lang="ts">
/**
 * VoiceCloneUpload - 音色复刻上传组件
 * 支持拖拽或点击上传音频样本文件，用于声音克隆
 * 提供文件验证、预览播放和清除功能
 */
import { ref, onUnmounted } from 'vue'

defineProps<{
  voiceBase64?: string | null
  hasFile?: boolean
}>()

const emit = defineEmits<{
  'update:voiceBase64': [value: string | null]
  'update:hasFile': [value: boolean]
}>()

/** 当前选中的文件 */
const selectedFile = ref<File | null>(null)
/** 拖拽悬停状态 */
const isDragover = ref(false)
/** 错误提示信息 */
const errorMsg = ref('')
/** 音频预览 URL */
const audioUrl = ref<string | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)

/** 用于避免竞态的条件变量 */
let currentFile: File | null = null

/**
 * 验证文件格式和大小
 * @param file - 待验证的文件
 * @returns 是否通过验证
 */
function validateFile(file: File): boolean {
  errorMsg.value = ''

  if (!ALLOWED_TYPES.some(t => file.type === t || file.name.endsWith('.mp3') || file.name.endsWith(t.replace('audio/', '.')))) {
    errorMsg.value = '仅支持 mp3、wav 格式的音频文件'
    return false
  }

  // 预估 Base64 后的字节数（Base64 编码膨胀约 1/3）
  const estimatedBase64Size = Math.ceil(file.size * 4 / 3)
  if (estimatedBase64Size > MAX_BASE64_BYTES) {
    errorMsg.value = '音频文件过大，Base64 编码后将超过 10MB，请使用小于 7.5MB 的文件'
    return false
  }

  return true
}

/**
 * 处理上传的文件：验证、预览、读取为 Base64
 */
function processFile(file: File) {
  if (!validateFile(file)) return
  currentFile = file

  selectedFile.value = file

  // 清理旧的预览 URL
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  audioUrl.value = URL.createObjectURL(file)

  // 使用 FileReader 读取为 DataURL（Base64）
  const reader = new FileReader()
  reader.onload = () => {
    if (currentFile !== file) return // 避免竞态
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

/** 清除当前文件 */
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

/** 拖拽悬停 */
function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragover.value = true
}

function onDragLeave() {
  isDragover.value = false
}

/** 拖拽释放处理 */
function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragover.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

/** 文件选择输入处理 */
function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) processFile(file)
}

/** 格式化文件大小显示 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 触发隐藏的文件选择器 */
function triggerFileInput() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.mp3,.wav,audio/mpeg,audio/wav'
  input.onchange = onFileInput
  input.click()
}

/** 切换音频预览播放/暂停 */
function togglePlay() {
  if (!audioRef.value) return
  if (audioRef.value.paused) {
    audioRef.value.play()
  } else {
    audioRef.value.pause()
  }
}

/** 组件卸载时清理预览 URL */
onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})
</script>

<template>
  <div class="voice-clone-upload">
    <!-- 拖拽上传区域 -->
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

    <!-- 已选文件信息 -->
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
      <!-- 操作按钮 -->
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
      <!-- 隐藏的音频元素用于预览 -->
      <audio v-if="audioUrl" ref="audioRef" :src="audioUrl" preload="metadata" class="hidden-audio" />
    </div>

    <!-- 错误提示 -->
    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
  </div>
</template>

<style scoped>
.voice-clone-upload {
  padding: 0 12px;
  font-family: var(--font-body, 'Noto Sans SC', sans-serif);
}

/* 拖拽上传区域 */
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

/* 已选文件信息栏 */
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
