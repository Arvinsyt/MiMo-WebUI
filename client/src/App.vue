<script setup lang="ts">
/**
 * App.vue - 应用根组件
 * TTS 语音合成工具主界面，包含音色选择、风格控制、文本输入和音频播放
 */
import { ref, computed, onMounted } from 'vue'
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

/** 当前选中的音色 ID */
const voiceId = ref('冰糖')
/** 是否启用音色复刻模式 */
const cloneMode = ref(false)
/** 复刻音频的 Base64 数据 */
const voiceBase64 = ref<string | null>(null)
/** 是否已上传音频文件 */
const hasVoiceFile = ref(false)
/** 风格控制模式 */
const styleMode = ref<StyleMode>('natural')
/** 自然语言风格描述文本 */
const stylePrompt = ref('')
/** 预设风格标签 */
const styleTag = ref('')
/** 要合成的文字内容 */
const text = ref('')

const { isLoading, audioBuffer, generateTts } = useTts()
const { isAuthenticated, checkAuth, logout } = useAuth()

/** 是否允许生成语音（文本不为空 + 复刻模式下已上传文件） */
const canGenerate = computed(() => {
  if (!text.value.trim()) return false
  if (cloneMode.value && !hasVoiceFile.value) return false
  return true
})

/** 执行语音生成 */
async function handleGenerate() {
  await generateTts({
    text: text.value,
    voiceId: cloneMode.value ? undefined : voiceId.value,
    voiceBase64: cloneMode.value ? (voiceBase64.value ?? undefined) : undefined,
    styleMode: styleMode.value,
    stylePrompt: stylePrompt.value,
    styleTag: styleTag.value
  })
}

/** 挂载时检查认证状态 */
onMounted(() => {
  checkAuth()
})

</script>

<template>
  <ToastContainer />
  <!-- 未认证显示登录门，已认证显示主界面 -->
  <AuthGate v-if="!isAuthenticated" />
  <div v-else class="app">
    <!-- 背景装饰光晕 -->
    <div class="bg-decoration">
      <div class="bg-orb bg-orb-1" />
      <div class="bg-orb bg-orb-2" />
      <div class="bg-orb bg-orb-3" />
    </div>

    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="header-inner">
        <div class="header-brand">
          <h1 class="title">MiMo V2.5 <span class="title-accent">TTS</span></h1>
          <p class="subtitle">语音合成工具</p>
        </div>
        <div class="header-actions">
          <!-- 状态指示器 -->
          <div class="header-status">
            <span class="status-dot" />
            <span class="status-text">就绪</span>
          </div>
          <!-- 退出登录按钮 -->
          <button class="logout-btn" @click="logout" title="退出登录">
            <svg class="logout-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 6l4 4-4 4" />
              <path d="M9 10h9" />
              <path d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2" />
            </svg>
            <span>退出</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容区域：侧边栏 + 合成面板 -->
    <main class="main">
      <!-- 左侧边栏：音色选择 + 风格控制 -->
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
          <!-- 复刻模式下显示文件上传组件 -->
          <VoiceCloneUpload
            v-if="cloneMode"
            v-model:voiceBase64="voiceBase64"
            v-model:hasFile="hasVoiceFile"
          />
        </div>

        <div class="sidebar-divider" />

        <div class="sidebar-section">
          <div class="section-header">
            <svg class="section-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 17a3 3 0 0 1 0-6 3 3 0 0 1 0 6Z" />
              <path d="M14 15a3 3 0 0 1 0-6 3 3 0 0 1 0 6Z" />
              <path d="M6 11V5a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v6" />
            </svg>
            <h2 class="section-label">声音风格</h2>
          </div>
          <StyleControl
            v-model:mode="styleMode"
            v-model:stylePrompt="stylePrompt"
            v-model:styleTag="styleTag"
          />
        </div>
      </aside>

      <!-- 右侧主面板：文本输入 + 生成按钮 + 播放器 -->
      <section class="content">
        <div class="content-card">
          <TextInput v-model="text" />
          <!-- 语音生成按钮 -->
          <button
            class="generate-btn"
            :disabled="isLoading || !canGenerate"
            @click="handleGenerate"
          >
            <svg v-if="!isLoading" class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.382 2.152a.75.75 0 0 1 .754.035l7 4.5a.75.75 0 0 1 0 1.243l-7 4.5A.75.75 0 0 1 9 11.75V8.204l-4.154 2.67A.75.75 0 0 1 3.5 10.25v-7a.75.75 0 0 1 1.346-1.124L9 4.795V1.25a.75.75 0 0 1 .382-.902Z" clip-rule="evenodd" />
              <path d="M14 14.25a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0v2.5Z" />
              <path d="M16 13.25a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5Z" />
              <path d="M12 15.25a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 1.5 0v3.5Z" />
            </svg>
            <span v-if="isLoading" class="spinner" />
            {{ isLoading ? '生成中...' : '生成语音' }}
          </button>
          <!-- 音频播放器 -->
          <AudioPlayer :audioBuffer="audioBuffer" />
        </div>
      </section>
    </main>
  </div>
</template>

<style>
/* ========== 全局样式 ========== */
:root {
  --color-bg: #faf7f4;
  --color-surface: #ffffff;
  --color-primary: #d4a574;
  --color-primary-dark: #b8845c;
  --color-primary-light: #f5e6d8;
  --color-primary-subtle: rgba(212, 165, 116, 0.1);
  --color-text: #2d2420;
  --color-text-secondary: #8b7d72;
  --color-text-hint: #b5a89c;
  --color-border: #ede4dc;
  --color-border-light: #f5efe8;
  --color-error-bg: #fdf0ed;
  --color-error-text: #c0392b;
  --color-success-bg: #edf7ed;
  --color-success-text: #2e7d32;
  --color-info-bg: #e3f2fd;
  --color-info-text: #1565c0;
  --font-heading: 'Noto Serif SC', 'PingFang SC', serif;
  --font-body: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: 'DM Sans', monospace;
}

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

<style scoped>
/* ========== 背景装饰 ========== */
.bg-decoration {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
}

.bg-orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle at 30% 30%, rgba(212, 165, 116, 0.12) 0%, transparent 70%);
  top: -200px;
  right: -100px;
  animation: orbFloat 20s ease-in-out infinite;
}

.bg-orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.06) 0%, transparent 70%);
  bottom: -100px;
  left: -80px;
  animation: orbFloat 25s ease-in-out infinite reverse;
}

.bg-orb-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle at 50% 50%, rgba(212, 165, 116, 0.08) 0%, transparent 70%);
  bottom: 20%;
  right: 15%;
  animation: orbFloat 18s ease-in-out infinite 5s;
}

/* 光晕浮动动画 */
@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
}

/* ========== 顶部导航栏 ========== */
.header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-brand {
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.title {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.title-accent {
  color: var(--color-primary);
  font-weight: 600;
}

.subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 400;
}

/* 状态指示器 */
.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: var(--color-primary-subtle);
  border-radius: 20px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4caf50;
  animation: pulseDot 2s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 退出登录按钮 */
.logout-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 20px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.logout-btn:hover {
  color: var(--color-primary-dark);
  border-color: var(--color-primary-light);
}

.logout-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* ========== 主内容布局 ========== */
.main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 32px 48px;
  display: flex;
  gap: 28px;
  width: 100%;
  flex: 1;
  position: relative;
  z-index: 1;
}

/* 侧边栏：固定宽度，粘性定位 */
.sidebar {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  height: fit-content;
  position: sticky;
  top: 88px;
}

.sidebar-section {
  background: var(--color-surface);
  border-radius: 14px;
  border: 1px solid var(--color-border-light);
  padding: 20px 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.sidebar-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 4px 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px 16px;
}

.section-icon {
  width: 16px;
  height: 16px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.section-label {
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  padding: 0;
}

/* 右侧内容区 */
.content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content-card {
  background: var(--color-surface);
  border-radius: 14px;
  border: 1px solid var(--color-border-light);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 语音合成按钮 */
.generate-btn {
  width: 100%;
  padding: 14px 24px;
  background: var(--color-primary);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.25s, transform 0.15s, box-shadow 0.25s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-body);
  letter-spacing: 0.02em;
}

.generate-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  box-shadow: 0 6px 20px rgba(212, 165, 116, 0.35);
  transform: translateY(-1px);
}

.generate-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.generate-btn:disabled {
  background: #d4c8be;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* 加载旋转器 */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========== 响应式适配 ========== */
@media (max-width: 768px) {
  .header-inner {
    padding: 14px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .header-brand {
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 20px;
  }

  .subtitle {
    font-size: 12px;
  }

  .main {
    flex-direction: column;
    padding: 20px 16px 40px;
    gap: 20px;
  }

  .sidebar {
    width: 100%;
    position: static;
  }

  .content-card {
    padding: 20px;
  }
}
</style>
