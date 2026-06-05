<script setup lang="ts">
/**
 * StyleControl - 声音风格控制组件
 * 支持两种模式：自然语言描述 / 预设标签
 */
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

/** 预设标签示例列表 */
const TAG_EXAMPLES = [
  '开心', '悲伤', '愤怒', '温柔', '高冷', '慵懒',
  '磁性', '清亮', '稚嫩', '东北话', '粤语', '唱歌'
]

/** 切换风格模式 */
function setMode(newMode: StyleMode) {
  emit('update:mode', newMode)
}

/** 选择预设标签 */
function selectTag(tag: string) {
  emit('update:styleTag', tag)
}
</script>

<template>
  <div class="style-control">
    <!-- 模式切换按钮 -->
    <div class="mode-switch">
      <button
        :class="['mode-btn', { active: mode === 'natural' }]"
        @click="setMode('natural')"
      >
        <svg class="mode-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 1v14M1 8h14M3.5 3.5l9 9M3.5 12.5l9-9" />
        </svg>
        自然语言
      </button>
      <button
        :class="['mode-btn', { active: mode === 'tag' }]"
        @click="setMode('tag')"
      >
        <svg class="mode-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 7.5V2.5a1.5 1.5 0 0 1 1.5-1.5h5a1.5 1.5 0 0 1 1.06.44l6.5 6.5a1.5 1.5 0 0 1 0 2.12l-5 5a1.5 1.5 0 0 1-2.12 0l-6.5-6.5A1.5 1.5 0 0 1 1 7.5Z" />
          <circle cx="4.5" cy="4.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        音频标签
      </button>
    </div>

    <!-- 自然语言模式：文本描述风格 -->
    <div v-if="mode === 'natural'" class="mode-content natural-mode">
      <textarea
        :value="stylePrompt"
        placeholder="用轻快上扬的语调，带着温柔的笑意说话..."
        class="style-textarea"
        @input="emit('update:stylePrompt', ($event.target as HTMLTextAreaElement).value)"
      />
      <p class="mode-hint">
        描述你想要的说话风格，如情感、语调、节奏等
      </p>
    </div>

    <!-- 标签模式：选择/输入风格标签 -->
    <div v-else class="mode-content tag-mode">
      <input
        :value="styleTag"
        type="text"
        placeholder="输入标签..."
        class="tag-input"
        @input="emit('update:styleTag', ($event.target as HTMLInputElement).value)"
      />
      <div class="tag-grid">
        <button
          v-for="tag in TAG_EXAMPLES"
          :key="tag"
          :class="['tag-pill', { selected: styleTag === tag }]"
          @click="selectTag(tag)"
        >
          {{ tag }}
        </button>
      </div>
      <p class="mode-hint">
        点击选择预设标签，或在上方输入框自定义
      </p>
    </div>
  </div>
</template>

<style scoped>
.style-control {
  padding: 0 12px;
  font-family: var(--font-body, 'Noto Sans SC', sans-serif);
}

/* 模式切换栏 */
.mode-switch {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
}

.mode-btn {
  flex: 1;
  padding: 10px 12px;
  background: transparent;
  border: 1.5px solid var(--color-border-light, #ede4dc);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #8b7d72);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: inherit;
}

.mode-btn:hover {
  border-color: var(--color-primary, #d4a574);
  color: var(--color-primary-dark, #b8845c);
  background: var(--color-primary-subtle, rgba(212, 165, 116, 0.06));
}

.mode-btn.active {
  background: var(--color-primary, #d4a574);
  border-color: var(--color-primary, #d4a574);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(212, 165, 116, 0.25);
}

.mode-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.mode-btn.active .mode-icon {
  stroke: #ffffff;
}

.mode-content {
  animation: fadeSlide 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 自然语言模式文本域 */
.natural-mode .style-textarea {
  width: 100%;
  min-height: 80px;
  padding: 12px 14px;
  background: var(--color-surface, #ffffff);
  border: 1.5px solid var(--color-border, #ede4dc);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text, #2d2420);
  resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
  box-sizing: border-box;
}

.natural-mode .style-textarea:focus {
  outline: none;
  border-color: var(--color-primary, #d4a574);
  box-shadow: 0 0 0 3px var(--color-primary-subtle, rgba(212, 165, 116, 0.15));
}

.natural-mode .style-textarea::placeholder {
  color: var(--color-text-hint, #b5a89c);
}

/* 标签模式输入框 */
.tag-mode .tag-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--color-surface, #ffffff);
  border: 1.5px solid var(--color-border, #ede4dc);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-text, #2d2420);
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  margin-bottom: 10px;
  font-family: inherit;
}

.tag-mode .tag-input:focus {
  outline: none;
  border-color: var(--color-primary, #d4a574);
  box-shadow: 0 0 0 3px var(--color-primary-subtle, rgba(212, 165, 116, 0.15));
}

.tag-mode .tag-input::placeholder {
  color: var(--color-text-hint, #b5a89c);
}

/* 标签网格 */
.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-pill {
  padding: 6px 12px;
  background: transparent;
  border: 1.5px solid var(--color-border-light, #ede4dc);
  border-radius: 14px;
  font-size: 12px;
  color: var(--color-text-secondary, #8b7d72);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  font-weight: 500;
}

.tag-pill:hover {
  border-color: var(--color-primary, #d4a574);
  color: var(--color-primary-dark, #b8845c);
  background: var(--color-primary-subtle, rgba(212, 165, 116, 0.08));
  transform: scale(1.03);
}

.tag-pill:active {
  transform: scale(0.96);
}

.tag-pill.selected {
  background: var(--color-primary, #d4a574);
  border-color: var(--color-primary, #d4a574);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(212, 165, 116, 0.25);
}

.mode-hint {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--color-text-hint, #b5a89c);
  line-height: 1.4;
}
</style>
