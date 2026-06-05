<script setup lang="ts">
/**
 * ToastContainer - 通知消息容器组件
 * 渲染全局通知列表，支持错误/成功/信息三种类型
 * 点击通知可手动关闭
 */
import { useNotification } from '../composables/useNotification'

const { notifications, remove } = useNotification()
</script>

<template>
  <!-- 通知列表，使用 TransitionGroup 实现动画 -->
  <TransitionGroup name="toast" tag="div" class="toast-container">
    <div
      v-for="n in notifications"
      :key="n.id"
      class="toast"
      :class="`toast--${n.type}`"
      @click="remove(n.id)"
    >
      <!-- 错误图标 -->
      <svg v-if="n.type === 'error'" class="toast-icon" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M8 8l6 6M14 8l-6 6" />
      </svg>
      <!-- 成功图标 -->
      <svg v-else-if="n.type === 'success'" class="toast-icon" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M7 11l3 3 5-5" />
      </svg>
      <!-- 信息图标 -->
      <svg v-else class="toast-icon" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M11 10v4" />
        <path d="M11 8v.01" />
      </svg>
      <span class="toast-text">{{ n.message }}</span>
      <button class="toast-close" @click.stop="remove(n.id)" aria-label="关闭">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  </TransitionGroup>
</template>

<style scoped>
/* 通知容器 - 顶部居中固定 */
.toast-container {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  max-width: 420px;
  width: 100%;
  padding: 0 16px;
}

/* 单个通知条 */
.toast {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px 14px 22px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
  pointer-events: auto;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  background:
    radial-gradient(ellipse at 0% 50%, rgba(212, 165, 116, 0.06) 0%, transparent 70%),
    rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    0 8px 32px rgba(212, 165, 116, 0.12),
    0 2px 8px rgba(45, 36, 32, 0.06);
}

.toast:hover {
  transform: translateY(-1px);
  box-shadow:
    0 12px 40px rgba(212, 165, 116, 0.18),
    0 4px 12px rgba(45, 36, 32, 0.08);
}

/* 左侧类型指示色条 */
.toast::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 2px;
}

.toast--error::before {
  background: linear-gradient(180deg, #e74c3c, #c0392b);
  box-shadow: 0 0 6px rgba(192, 57, 43, 0.15);
}

.toast--success::before {
  background: linear-gradient(180deg, #4caf50, #2e7d32);
  box-shadow: 0 0 6px rgba(46, 125, 50, 0.15);
}

.toast--info::before {
  background: linear-gradient(180deg, #42a5f5, #1565c0);
  box-shadow: 0 0 6px rgba(21, 101, 192, 0.15);
}

/* 不同类型文字颜色 */
.toast--error { color: var(--color-error-text, #c0392b); }
.toast--success { color: var(--color-success-text, #2e7d32); }
.toast--info { color: var(--color-info-text, #1565c0); }

.toast-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.toast-text {
  flex: 1;
  color: var(--color-text, #2d2420);
  font-weight: 450;
  letter-spacing: 0.01em;
}

/* 关闭按钮 */
.toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.35;
  transition: opacity 0.2s ease, background 0.2s ease;
  color: var(--color-text-secondary, #8b7d72);
}

.toast-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

.toast-close svg {
  width: 14px;
  height: 14px;
}

/* 入场动画 */
.toast-enter-active {
  animation: toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 离场动画 */
.toast-leave-active {
  animation: toastOut 0.2s ease-in forwards;
}

/* 列表重排过渡 */
.toast-move {
  transition: transform 0.3s ease;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateY(-16px) scale(0.94); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes toastOut {
  from { opacity: 1; transform: translateX(0) scale(1); }
  to { opacity: 0; transform: translateX(20px) scale(0.96); }
}
</style>
