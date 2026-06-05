<script setup lang="ts">
/**
 * VoiceSelector - 音色选择器组件
 * 提供预置音色选择和音色复刻模式的切换
 */
import { VOICE_PRESETS, type VoicePreset } from '@/types'

withDefaults(defineProps<{
  modelValue: string
  cloneMode?: boolean
}>(), {
  cloneMode: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:cloneMode': [value: boolean]
}>()

/** 选择预置音色 */
function selectVoice(voice: VoicePreset) {
  emit('update:modelValue', voice.voiceId)
}

/** 切换音色复刻模式 */
function setCloneMode(value: boolean) {
  emit('update:cloneMode', value)
}
</script>

<template>
  <div class="voice-selector">
    <!-- 模式切换标签页 -->
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
    <!-- 预置音色网格 -->
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

<style scoped>
/* 音色网格 - 两列布局 */
.voice-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 0 12px;
  box-sizing: border-box;
}

/* 音色选项卡片 */
.voice-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: 1.5px solid var(--color-border-light, #ede4dc);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: var(--font-body, 'Noto Sans SC', sans-serif);
  text-align: left;
}

.voice-item:hover {
  border-color: var(--color-primary, #d4a574);
  background: var(--color-primary-subtle, rgba(212, 165, 116, 0.06));
  transform: translateY(-1px);
}

.voice-item:active {
  transform: scale(0.97);
}

.voice-item.selected {
  background: var(--color-primary-subtle, rgba(212, 165, 116, 0.12));
  border-color: var(--color-primary, #d4a574);
  box-shadow: 0 2px 8px rgba(212, 165, 116, 0.15);
}

/* 音色图标容器 */
.voice-emoji {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border-light, #f5efe8);
  border-radius: 8px;
}

.voice-item.selected .voice-emoji {
  background: var(--color-primary-light, #f5e6d8);
}

.voice-info {
  min-width: 0;
}

.voice-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #2d2420);
  line-height: 1.3;
}

.voice-item.selected .voice-name {
  color: var(--color-primary-dark, #b8845c);
}

.voice-meta {
  display: block;
  font-size: 10px;
  color: var(--color-text-hint, #b5a89c);
  line-height: 1.2;
  margin-top: 1px;
  font-weight: 400;
}

/* 模式切换标签页 */
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
</style>
