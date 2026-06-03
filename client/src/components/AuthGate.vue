<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useNotification } from '../composables/useNotification'

const emit = defineEmits<{ authenticated: [] }>()
const { login } = useAuth()
const { showError, showSuccess } = useNotification()

const password = ref('')
const loading = ref(false)

async function handleSubmit() {
  if (!password.value.trim()) return
  loading.value = true
  try {
    await login(password.value)
    showSuccess('验证成功，欢迎回来')
    emit('authenticated')
  } catch (err: any) {
    showError(err.message || '验证失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-gate">
    <div class="ambient">
      <div class="ambient-orb ambient-orb-1" />
      <div class="ambient-orb ambient-orb-2" />
      <div class="ambient-orb ambient-orb-3" />
      <div class="ambient-orb ambient-orb-4" />
      <div class="ambient-floor" />
    </div>

    <div class="waveform" aria-hidden="true">
      <span v-for="n in 48" :key="n" class="wave-bar" :style="{
        animationDelay: `${n * 0.06}s`,
        animationDuration: `${1.4 + Math.sin(n * 0.25) * 0.3}s`,
      }" />
    </div>

    <div class="gate-card">
      <div class="card-emblem">
        <div class="emblem-dot" />
        <div class="emblem-ring emblem-ring-1" />
        <div class="emblem-ring emblem-ring-2" />
        <div class="emblem-ring emblem-ring-3" />
      </div>

      <h1 class="gate-title">
        <span class="title-line title-line-1">MiMo TTS</span>
        <span class="title-line title-line-2">工作室</span>
      </h1>

      <p class="gate-subtitle">输入密码以进入语音工坊</p>

      <form class="gate-form" @submit.prevent="handleSubmit">
        <div class="input-wrap">
          <svg class="input-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="14" height="10" rx="2" />
            <path d="M7 17h6M10 13v4" />
          </svg>
          <input
            id="gate-password"
            v-model="password"
            type="password"
            class="gate-input"
            placeholder="请输入密码"
            autocomplete="current-password"
            :disabled="loading"
          />
          <label for="gate-password" class="input-label">密码</label>
        </div>

        <button
          type="submit"
          class="gate-btn"
          :disabled="loading || !password.trim()"
        >
          <svg v-if="!loading" class="btn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 10l4 4 6-6" />
          </svg>
          <span v-if="loading" class="btn-spinner" />
          {{ loading ? '验证中...' : '验证身份' }}
        </button>
      </form>
    </div>

    <div class="footer-note">
      <span class="note-dot" />
      安全连接 · 加密传输
    </div>
  </div>
</template>

<style scoped>
.auth-gate {
  position: fixed;
  inset: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #161210;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(212, 165, 116, 0.03) 1px, transparent 0),
    radial-gradient(circle at 1px 1px, rgba(212, 165, 116, 0.015) 1px, transparent 0);
  background-size: 24px 24px, 12px 12px;
  color: #faf7f4;
  font-family: var(--font-body);
  z-index: 100;
  overflow: hidden;
}

.ambient {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
}

.ambient-orb-1 {
  width: 800px;
  height: 800px;
  background: radial-gradient(circle at 30% 30%, rgba(212, 165, 116, 0.12) 0%, transparent 70%);
  top: -200px;
  right: -200px;
  animation: orbSway 20s ease-in-out infinite;
}

.ambient-orb-2 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle at 70% 70%, rgba(196, 149, 90, 0.08) 0%, transparent 70%);
  bottom: -150px;
  left: -150px;
  animation: orbSway 25s ease-in-out infinite reverse;
}

.ambient-orb-3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle at 50% 50%, rgba(212, 165, 116, 0.06) 0%, transparent 70%);
  top: 30%;
  left: 5%;
  animation: orbSway 18s ease-in-out infinite 3s;
}

.ambient-orb-4 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.04) 0%, transparent 70%);
  bottom: 15%;
  right: 8%;
  animation: orbSway 22s ease-in-out infinite 6s;
}

.ambient-floor {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212, 165, 116, 0.03) 0%, transparent 100%),
    radial-gradient(ellipse 60% 40% at 50% 100%, rgba(196, 149, 90, 0.02) 0%, transparent 100%);
}

@keyframes orbSway {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
  33% { transform: translate(40px, -30px) scale(1.12); opacity: 1; }
  66% { transform: translate(-30px, 20px) scale(0.88); opacity: 0.6; }
}

.waveform {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3px;
  padding: 0 8%;
  z-index: 1;
  pointer-events: none;
  opacity: 0.5;
  animation: waveReveal 1.2s ease both;
}

@keyframes waveReveal {
  from { opacity: 0; transform: scaleY(0.3); }
  to { opacity: 0.5; transform: scaleY(1); }
}

.wave-bar {
  width: 4px;
  min-height: 4px;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(to top,
    rgba(212, 165, 116, 0.7) 0%,
    rgba(212, 165, 116, 0.15) 60%,
    transparent 100%
  );
  animation: waveDance 3s ease-in-out infinite;
  transform-origin: bottom;
}

.wave-bar:nth-child(odd) {
  animation-duration: 2.8s;
}

.wave-bar:nth-child(3n) {
  width: 3px;
  animation-duration: 3.2s;
}

.wave-bar:nth-child(5n+2) {
  width: 5px;
  animation-duration: 2.6s;
}

.wave-bar:nth-child(7n+4) {
  width: 2px;
  animation-duration: 3.6s;
}

.wave-bar:nth-child(11n+5) {
  width: 6px;
  animation-duration: 2.4s;
}

@keyframes waveDance {
  0%, 100% { height: 4px; opacity: 0.15; }
  15% { height: 48px; opacity: 0.7; }
  30% { height: 20px; opacity: 0.4; }
  50% { height: 64px; opacity: 1; }
  65% { height: 12px; opacity: 0.3; }
  80% { height: 36px; opacity: 0.6; }
}

.gate-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 420px;
  padding: 52px 44px 40px;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(212, 165, 116, 0.04) 0%, transparent 60%),
    rgba(22, 18, 16, 0.7);
  border: 1px solid rgba(212, 165, 116, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  box-shadow:
    0 0 80px rgba(212, 165, 116, 0.04),
    0 0 160px rgba(212, 165, 116, 0.02),
    inset 0 1px 0 rgba(212, 165, 116, 0.08);
  overflow: hidden;
  animation: cardEnter 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.gate-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 165, 116, 0.25), transparent);
  border-radius: 100%;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96) perspective(600px) rotateX(6deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1) perspective(600px) rotateX(0deg);
  }
}

.card-emblem {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  animation: emblemEnter 1s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.12s;
}

@keyframes emblemEnter {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.emblem-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 20px rgba(212, 165, 116, 0.35);
  z-index: 1;
}

.emblem-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(212, 165, 116, 0.15);
  animation: ringRipple 3s ease-out infinite;
}

.emblem-ring-1 {
  width: 40px;
  height: 40px;
}

.emblem-ring-2 {
  width: 56px;
  height: 56px;
  animation-delay: 1s;
}

.emblem-ring-3 {
  width: 72px;
  height: 72px;
  animation-delay: 2s;
}

@keyframes ringRipple {
  0% { transform: scale(0.6); opacity: 0.6; }
  100% { transform: scale(1.6); opacity: 0; }
}

.gate-title {
  font-family: var(--font-heading);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-bottom: 10px;
  animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.25s;
}

.title-line-1 {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.08em;
  background: linear-gradient(135deg, #f5e6d8 0%, var(--color-primary) 50%, #c4955a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 16px rgba(212, 165, 116, 0.15));
}

.title-line-2 {
  font-size: 18px;
  font-weight: 500;
  color: rgba(250, 247, 244, 0.5);
  letter-spacing: 0.15em;
}

.gate-subtitle {
  font-size: 13px;
  color: rgba(250, 247, 244, 0.3);
  margin-bottom: 32px;
  letter-spacing: 0.04em;
  animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.35s;
}

.gate-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.45s;
}

.input-wrap {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: rgba(250, 247, 244, 0.2);
  pointer-events: none;
  transition: color 0.3s;
  z-index: 1;
}

.gate-input {
  width: 100%;
  padding: 16px 16px 16px 46px;
  background: rgba(250, 247, 244, 0.03);
  border: 1px solid rgba(212, 165, 116, 0.1);
  border-radius: 14px;
  font-size: 15px;
  font-family: var(--font-body);
  color: #faf7f4;
  outline: none;
  transition: border-color 0.3s, background 0.3s, box-shadow 0.3s;
}

.gate-input::placeholder {
  color: rgba(250, 247, 244, 0.12);
}

.gate-input:focus {
  border-color: var(--color-primary);
  background: rgba(212, 165, 116, 0.05);
  box-shadow:
    0 0 0 3px rgba(212, 165, 116, 0.08),
    0 0 24px rgba(212, 165, 116, 0.04);
}

.gate-input:focus ~ .input-icon {
  color: var(--color-primary);
}

.gate-input:focus ~ .input-label {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

.gate-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-label {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%) scale(0.9);
  font-size: 11px;
  font-weight: 500;
  color: var(--color-primary);
  letter-spacing: 0.08em;
  opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none;
}

.gate-btn {
  position: relative;
  width: 100%;
  padding: 15px 24px;
  background: linear-gradient(135deg, #d4a574 0%, #b8845c 100%);
  color: #161210;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  overflow: hidden;
  transition: opacity 0.25s, transform 0.15s, box-shadow 0.25s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.04em;
}

.gate-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  transition: left 0.6s ease;
}

.gate-btn:hover:not(:disabled)::before {
  left: 100%;
}

.gate-btn:hover:not(:disabled) {
  box-shadow: 0 8px 28px rgba(212, 165, 116, 0.35);
  transform: translateY(-1px);
}

.gate-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.gate-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(22, 18, 16, 0.2);
  border-top-color: #161210;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.footer-note {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(250, 247, 244, 0.2);
  letter-spacing: 0.06em;
  z-index: 1;
  animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: 0.65s;
}

.note-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(250, 247, 244, 0.2);
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
