<script setup lang="ts">
/**
 * TextInput - 文本输入组件
 * 用于输入要合成语音的文字内容，显示字数统计
 */
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="text-input">
    <!-- 文本输入区域 -->
    <textarea
      :value="modelValue"
      placeholder="在此输入要合成的文字内容..."
      class="textarea"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <!-- 字数统计 -->
    <div class="char-count">{{ modelValue.length }} 字</div>
  </div>
</template>

<style scoped>
.text-input {
  position: relative;
}

.textarea {
  width: 100%;
  min-height: 140px;
  padding: 16px 18px;
  background: var(--color-bg, #faf7f4);
  border: 1.5px solid var(--color-border, #ede4dc);
  border-radius: 10px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text, #2d2420);
  resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: var(--font-body, 'Noto Sans SC', sans-serif);
  box-sizing: border-box;
}

.textarea:focus {
  outline: none;
  border-color: var(--color-primary, #d4a574);
  box-shadow: 0 0 0 3px var(--color-primary-subtle, rgba(212, 165, 116, 0.12));
  background: var(--color-surface, #ffffff);
}

.textarea::placeholder {
  color: var(--color-text-hint, #b5a89c);
  font-weight: 400;
}

/* 字数统计 - 右下角定位 */
.char-count {
  position: absolute;
  right: 14px;
  bottom: 12px;
  font-size: 12px;
  color: var(--color-text-hint, #b5a89c);
  pointer-events: none;
  line-height: 1;
  font-family: var(--font-mono, 'DM Sans', monospace);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
</style>
