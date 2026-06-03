<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useNotification } from '../composables/useNotification'

const { showError } = useNotification()

const props = defineProps<{
  audioBuffer: ArrayBuffer | null
}>()

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progress = ref(0)

let audioContext: AudioContext | null = null
let sourceNode: AudioBufferSourceNode | null = null
let decodedBuffer: AudioBuffer | null = null
let startTime = 0
let pauseTime = 0
let animFrameId: number | null = null

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function play() {
  if (!decodedBuffer) return
  if (!audioContext) audioContext = new AudioContext()
  if (audioContext.state === 'suspended') await audioContext.resume()

  sourceNode = audioContext.createBufferSource()
  sourceNode.buffer = decodedBuffer
  sourceNode.connect(audioContext.destination)

  sourceNode.onended = () => {
    isPlaying.value = false
    currentTime.value = 0
    progress.value = 0
    pauseTime = 0
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId)
      animFrameId = null
    }
  }

  startTime = audioContext.currentTime - pauseTime
  sourceNode.start(0, pauseTime)
  isPlaying.value = true
  updateProgress()
}

function pause() {
  if (!sourceNode || !audioContext) return
  sourceNode.onended = null
  sourceNode.stop()
  sourceNode.disconnect()
  pauseTime = audioContext.currentTime - startTime
  currentTime.value = pauseTime
  progress.value = (pauseTime / duration.value) * 100
  isPlaying.value = false
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
}

function togglePlay() {
  if (isPlaying.value) pause()
  else play()
}

function seek(e: MouseEvent) {
  if (!decodedBuffer || !audioContext) return
  const bar = e.currentTarget as HTMLElement
  const rect = bar.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const seekTime = ratio * duration.value

  if (isPlaying.value) {
    if (sourceNode) sourceNode.onended = null
    sourceNode?.stop()
    sourceNode?.disconnect()
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId)
      animFrameId = null
    }
  }

  pauseTime = seekTime
  currentTime.value = seekTime
  progress.value = ratio * 100

  if (isPlaying.value) {
    play()
  }
}

function updateProgress() {
  if (!isPlaying.value || !audioContext) return
  currentTime.value = audioContext.currentTime - startTime
  progress.value = (currentTime.value / duration.value) * 100
  if (isPlaying.value) {
    animFrameId = requestAnimationFrame(updateProgress)
  }
}

function downloadWav() {
  if (!props.audioBuffer) return
  const blob = new Blob([props.audioBuffer], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mimo_tts_${Date.now()}.wav`
  a.click()
  URL.revokeObjectURL(url)
}

watch(() => props.audioBuffer, async (newVal) => {
  if (isPlaying.value) {
    if (sourceNode) sourceNode.onended = null
    sourceNode?.stop()
    sourceNode?.disconnect()
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId)
      animFrameId = null
    }
  }

  if (newVal) {
    if (audioContext) await audioContext.close()
    audioContext = new AudioContext()
    try {
      decodedBuffer = await audioContext.decodeAudioData(newVal)
    } catch {
      decodedBuffer = null
      showError('音频解码失败')
      return
    }
    duration.value = decodedBuffer.duration
    currentTime.value = 0
    progress.value = 0
    pauseTime = 0
    isPlaying.value = false
  } else {
    decodedBuffer = null
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    duration.value = 0
    currentTime.value = 0
    progress.value = 0
    pauseTime = 0
    isPlaying.value = false
  }
})

onUnmounted(() => {
  if (animFrameId !== null) cancelAnimationFrame(animFrameId)
  sourceNode?.disconnect()
  if (audioContext) audioContext.close()
})
</script>

<template>
  <Transition name="player-fade">
    <div v-if="audioBuffer" class="audio-player">
      <button
        class="play-btn"
        :class="{ playing: isPlaying }"
        @click="togglePlay"
      >
        <svg v-if="!isPlaying" class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      </button>

      <div class="player-body">
        <div class="time-row">
          <span class="time current">{{ formatTime(currentTime) }}</span>
          <span class="time">{{ formatTime(duration) }}</span>
        </div>
        <div class="progress-track" @click="seek">
          <div class="progress-fill" :style="{ width: progress + '%' }" />
          <div class="progress-thumb" :style="{ left: progress + '%' }" />
        </div>
      </div>

      <button class="download-btn" title="下载 WAV" @click="downloadWav">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.audio-player {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: var(--color-bg, #faf7f4);
  border-radius: 12px;
  border: 1px solid var(--color-border-light, #f5efe8);
  font-family: var(--font-body, 'Noto Sans SC', sans-serif);
  animation: fadeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.play-btn {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary, #d4a574);
  border: none;
  border-radius: 50%;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;
}

.play-btn:hover {
  background: var(--color-primary-dark, #b8845c);
  box-shadow: 0 4px 14px rgba(212, 165, 116, 0.35);
  transform: scale(1.05);
}

.play-btn:active {
  transform: scale(0.92);
}

.play-btn.playing {
  background: var(--color-primary-dark, #b8845c);
}

.play-btn .icon {
  width: 20px;
  height: 20px;
}

.player-body {
  flex: 1;
  min-width: 0;
}

.time-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.time {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-hint, #b5a89c);
  font-family: var(--font-mono, 'DM Sans', monospace);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.time.current {
  color: var(--color-primary-dark, #b8845c);
}

.progress-track {
  position: relative;
  height: 5px;
  background: var(--color-border, #ede4dc);
  border-radius: 3px;
  cursor: pointer;
  overflow: visible;
  transition: height 0.15s;
}

.progress-track:hover {
  height: 7px;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary, #d4a574), var(--color-primary-dark, #b8845c));
  border-radius: 3px;
  transition: width 0.05s linear;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: #ffffff;
  border: 2.5px solid var(--color-primary, #d4a574);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  transition: opacity 0.15s;
  pointer-events: none;
}

.progress-track:hover .progress-thumb {
  opacity: 1;
}

.download-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1.5px solid var(--color-border, #ede4dc);
  border-radius: 8px;
  color: var(--color-text-secondary, #8b7d72);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.download-btn:hover {
  border-color: var(--color-primary, #d4a574);
  color: var(--color-primary-dark, #b8845c);
  background: var(--color-primary-subtle, rgba(212, 165, 116, 0.1));
}

.download-btn:active {
  transform: scale(0.92);
}

.download-btn .icon {
  width: 16px;
  height: 16px;
}

.player-fade-enter-active {
  animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.player-fade-leave-active {
  animation: slideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1) reverse;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
