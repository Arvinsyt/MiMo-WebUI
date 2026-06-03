# 访问密码验证功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 MiMo TTS WebUI 添加访问密码验证，防止未授权使用。

**Architecture:** 后端新增 `/api/auth` 路由验证密码并发放 token，auth 中间件保护所有 `/api/*` 路由。前端使用单例 composable 管理认证状态，未认证时显示 AuthGate 组件，已认证后所有 API 请求携带 Bearer token。

**Tech Stack:** Node.js Express + Vue 3，无额外依赖。

---

### Task 1: 后端 — config.ts 添加 ACCESS_PASSWORD

**Files:**
- Modify: `server/src/config.ts`

- [ ] **Step 1: 添加 accessPassword 配置项**

```typescript
// server/src/config.ts — 在 export const config 对象中添加 accessPassword
export const config = {
  port: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === 'production',
  apiKey: isPlaceholder ? '' : rawApiKey,
  apiBase: 'https://api.xiaomimimo.com/v1',
  accessPassword: process.env.ACCESS_PASSWORD || ''
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/config.ts
git commit -m "feat: 添加 ACCESS_PASSWORD 配置项"
```

### Task 2: 后端 — middleware/auth.ts 新增 auth 中间件

**Files:**
- Create: `server/src/middleware/auth.ts`

- [ ] **Step 1: 创建 auth 中间件**

```typescript
// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'

const validTokens = new Set<string>()

export function addToken(token: string) {
  validTokens.add(token)
}

export function removeToken(token: string) {
  validTokens.delete(token)
}

export function isValidToken(token: string): boolean {
  return validTokens.has(token)
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未授权，请先验证' })
    return
  }

  const token = authHeader.slice(7)
  if (!isValidToken(token)) {
    res.status(401).json({ error: '未授权，请先验证' })
    return
  }

  next()
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/middleware/auth.ts
git commit -m "feat: 添加 auth 中间件和 token 管理"
```

### Task 3: 后端 — routes/auth.ts 新增认证路由

**Files:**
- Create: `server/src/routes/auth.ts`

- [ ] **Step 1: 创建 auth 路由**

```typescript
// server/src/routes/auth.ts
import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { config } from '../config.js'
import { addToken } from '../middleware/auth.js'

const router = Router()

router.post('/auth', (req: Request, res: Response) => {
  const { password } = req.body as { password?: string }

  if (!password) {
    res.status(400).json({ error: '密码不能为空' })
    return
  }

  if (!config.accessPassword) {
    res.status(500).json({ error: '服务未配置访问密码，请在 .env 中设置 ACCESS_PASSWORD' })
    return
  }

  if (password !== config.accessPassword) {
    res.status(401).json({ error: '密码错误' })
    return
  }

  const token = randomUUID()
  addToken(token)
  res.json({ token })
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/auth.ts
git commit -m "feat: 添加 POST /api/auth 认证接口"
```

### Task 4: 后端 — index.ts 接入 auth

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: 在 index.ts 中引入并注册 auth 路由和中间件**

```typescript
// server/src/index.ts — 改动内容
import ttsRouter from './routes/tts.js'
import authRouter from './routes/auth.js'
import { authMiddleware } from './middleware/auth.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 公开路由（无需认证）
app.use('/api', authRouter)

// 受保护路由，中间件之后注册
app.use('/api', authMiddleware, ttsRouter)
```

完整文件内容：

```typescript
import express from 'express'
import cors from 'cors'
import { resolve } from 'path'
import { config } from './config.js'
import ttsRouter from './routes/tts.js'
import authRouter from './routes/auth.js'
import { authMiddleware } from './middleware/auth.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api', authRouter)
app.use('/api', authMiddleware, ttsRouter)

if (config.isProduction) {
  const clientDist = resolve(import.meta.dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(resolve(clientDist, 'index.html'))
  })
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', apiKeyConfigured: !!config.apiKey })
})

app.listen(config.port, () => {
  console.log(`服务器已启动: http://localhost:${config.port}`)
  console.log(`API Key 已配置: ${!!config.apiKey}`)
  console.log(`访问密码已配置: ${!!config.accessPassword}`)
})
```

- [ ] **Step 2: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: 接入 auth 中间件保护 /api/* 路由"
```

### Task 5: 前端 — composables/useAuth.ts 新增认证状态管理

**Files:**
- Create: `client/src/composables/useAuth.ts`

- [ ] **Step 1: 创建 useAuth composable**

```typescript
// client/src/composables/useAuth.ts
import { ref, computed } from 'vue'

const token = ref<string | null>(null)

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)

  function checkAuth() {
    const stored = localStorage.getItem('auth_token')
    if (stored) {
      token.value = stored
    }
  }

  async function login(password: string): Promise<boolean> {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })

    if (!response.ok) {
      const data = await response.json() as { error?: string }
      throw new Error(data.error || '验证失败')
    }

    const data = await response.json() as { token: string }
    token.value = data.token
    localStorage.setItem('auth_token', data.token)
    return true
  }

  function logout() {
    token.value = null
    localStorage.removeItem('auth_token')
  }

  return { token, isAuthenticated, checkAuth, login, logout }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/composables/useAuth.ts
git commit -m "feat: 添加 useAuth 认证状态管理"
```

### Task 6: 前端 — components/AuthGate.vue 新增验证页面

**Files:**
- Create: `client/src/components/AuthGate.vue`

- [ ] **Step 1: 创建 AuthGate 组件（风格 B — 全屏欢迎页）**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const emit = defineEmits<{ authenticated: [] }>()

const { login } = useAuth()
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  if (!password.value.trim()) return
  loading.value = true
  error.value = ''

  try {
    await login(password.value)
    emit('authenticated')
  } catch (err: any) {
    error.value = err.message || '验证失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-gate">
    <div class="bg-decoration">
      <div class="bg-orb bg-orb-1" />
      <div class="bg-orb bg-orb-2" />
      <div class="bg-orb bg-orb-3" />
    </div>

    <div class="auth-card">
      <div class="auth-icon">🎤</div>
      <h1 class="auth-title">MiMo TTS</h1>
      <p class="auth-subtitle">请验证后使用语音合成工具</p>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <input
          v-model="password"
          class="auth-input"
          type="password"
          placeholder="访问密码"
          :disabled="loading"
          autocomplete="off"
        />
        <button
          class="auth-btn"
          type="submit"
          :disabled="loading || !password.trim()"
        >
          <span v-if="loading" class="spinner" />
          {{ loading ? '验证中...' : '进入' }}
        </button>
      </form>

      <p v-if="error" class="auth-error">{{ error }}</p>
      <p class="auth-hint">密码在 .env 文件中配置</p>
    </div>
  </div>
</template>

<style scoped>
.auth-gate {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  position: relative;
  overflow: hidden;
}

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

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
}

.auth-card {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 48px 40px;
  background: var(--color-surface);
  border-radius: 16px;
  border: 1px solid var(--color-border-light);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  width: 360px;
  max-width: 90vw;
  animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.auth-title {
  font-family: var(--font-heading);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}

.auth-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 28px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 15px;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-bg);
  outline: none;
  transition: border-color 0.2s;
  text-align: center;
}

.auth-input:focus {
  border-color: var(--color-primary);
}

.auth-input:disabled {
  opacity: 0.6;
}

.auth-btn {
  width: 100%;
  padding: 12px 24px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.25s, transform 0.15s;
  font-family: var(--font-body);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.auth-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
}

.auth-btn:disabled {
  background: #d4c8be;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-error {
  color: var(--color-error-text);
  font-size: 13px;
  margin-top: 16px;
  padding: 8px 12px;
  background: var(--color-error-bg);
  border-radius: 8px;
}

.auth-hint {
  font-size: 12px;
  color: var(--color-text-hint);
  margin-top: 20px;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/AuthGate.vue
git commit -m "feat: 添加 AuthGate 验证页面组件"
```

### Task 7: 前端 — App.vue 接入认证流程

**Files:**
- Modify: `client/src/App.vue`

- [ ] **Step 1: 在 App.vue 中引入 useAuth 和 AuthGate，添加条件渲染**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import VoiceSelector from './components/VoiceSelector.vue'
import StyleControl from './components/StyleControl.vue'
import TextInput from './components/TextInput.vue'
import AudioPlayer from './components/AudioPlayer.vue'
import AuthGate from './components/AuthGate.vue'
import { useTts } from './composables/useTts'
import { useAuth } from './composables/useAuth'
import type { StyleMode } from './types'

const { isAuthenticated, checkAuth } = useAuth()
const { isLoading, error, audioBase64, generateTts } = useTts()

const voiceId = ref('冰糖')
const styleMode = ref<StyleMode>('natural')
const stylePrompt = ref('')
const styleTag = ref('')
const text = ref('')

onMounted(() => {
  checkAuth()
})

function onAuthenticated() {
  // isAuthenticated computed 会自动更新
}

async function handleGenerate() {
  await generateTts({
    text: text.value,
    voiceId: voiceId.value,
    styleMode: styleMode.value,
    stylePrompt: stylePrompt.value,
    styleTag: styleTag.value
  })
}
</script>

<template>
  <AuthGate v-if="!isAuthenticated" @authenticated="onAuthenticated" />
  <div v-else class="app">
    <!-- 原有的全部模板内容不变 -->
    <div class="bg-decoration">
      <div class="bg-orb bg-orb-1" />
      <div class="bg-orb bg-orb-2" />
      <div class="bg-orb bg-orb-3" />
    </div>

    <header class="header">
      <div class="header-inner">
        <div class="header-brand">
          <h1 class="title">MiMo V2.5 <span class="title-accent">TTS</span></h1>
          <p class="subtitle">语音合成工具</p>
        </div>
        <div class="header-status">
          <span class="status-dot" />
          <span class="status-text">就绪</span>
        </div>
      </div>
    </header>

    <main class="main">
      <aside class="sidebar">
        <div class="sidebar-section">
          <div class="section-header">
            <svg class="section-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.93 3.93l1.41 1.41M14.66 14.66l1.41 1.41M3.93 16.07l1.41-1.41M14.66 5.34l1.41-1.41" /></svg>
            <h2 class="section-label">选择音色</h2>
          </div>
          <VoiceSelector v-model="voiceId" />
        </div>

        <div class="sidebar-divider" />

        <div class="sidebar-section">
          <div class="section-header">
            <svg class="section-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 17a3 3 0 0 1 0-6 3 3 0 0 1 0 6Z" /><path d="M14 15a3 3 0 0 1 0-6 3 3 0 0 1 0 6Z" /><path d="M6 11V5a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v6" /></svg>
            <h2 class="section-label">声音风格</h2>
          </div>
          <StyleControl
            v-model:mode="styleMode"
            v-model:stylePrompt="stylePrompt"
            v-model:styleTag="styleTag"
          />
        </div>
      </aside>

      <section class="content">
        <div class="content-card">
          <TextInput v-model="text" />
          <button
            class="generate-btn"
            :disabled="isLoading || !text.trim()"
            @click="handleGenerate"
          >
            <svg v-if="!isLoading" class="btn-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.382 2.152a.75.75 0 0 1 .754.035l7 4.5a.75.75 0 0 1 0 1.243l-7 4.5A.75.75 0 0 1 9 11.75V8.204l-4.154 2.67A.75.75 0 0 1 3.5 10.25v-7a.75.75 0 0 1 1.346-1.124L9 4.795V1.25a.75.75 0 0 1 .382-.902Z" clip-rule="evenodd" /><path d="M14 14.25a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0v2.5Z" /><path d="M16 13.25a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5Z" /><path d="M12 15.25a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 1.5 0v3.5Z" /></svg>
            <span v-if="isLoading" class="spinner" />
            {{ isLoading ? '生成中...' : '生成语音' }}
          </button>
          <div v-if="error" class="error-box">
            <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" /></svg>
            <span>{{ error }}</span>
          </div>
          <AudioPlayer :audioBase64="audioBase64" />
        </div>
      </section>
    </main>
  </div>
</template>
```

（注意：`<style>` 部分保持不变）

- [ ] **Step 2: Commit**

```bash
git add client/src/App.vue
git commit -m "feat: App.vue 接入认证流程，未认证显示 AuthGate"
```

### Task 8: 前端 — useTts.ts 添加 Authorization 请求头

**Files:**
- Modify: `client/src/composables/useTts.ts`

- [ ] **Step 1: 在 useTts 中导入 useAuth 并添加 token 到请求头**

```typescript
import { ref } from 'vue'
import type { TtsRequest, TtsResponse } from '@/types'
import { useAuth } from './useAuth'

export function useTts() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const audioBase64 = ref<string | null>(null)
  const { token, logout } = useAuth()

  async function generateTts(request: TtsRequest): Promise<void> {
    isLoading.value = true
    error.value = null
    audioBase64.value = null

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.value}`
        },
        body: JSON.stringify(request)
      })

      if (response.status === 401) {
        logout()
        throw new Error('认证已过期，请重新验证')
      }

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error || `请求失败: ${response.status}`)
      }

      const data = await response.json() as TtsResponse
      audioBase64.value = data.audioBase64
    } catch (err: any) {
      error.value = err.message || '未知错误'
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, audioBase64, generateTts }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/composables/useTts.ts
git commit -m "feat: useTts 添加 Authorization 请求头并处理 401"
```

### Task 9: 更新 .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: 添加 ACCESS_PASSWORD 示例**

```
# MiMo TTS API Key（必填）
MIMO_API_KEY=your_api_key_here

# 访问密码（可选，设置后需验证才能使用）
ACCESS_PASSWORD=

# 服务端口号（可选，默认 3000）
PORT=3000

# 运行环境（development / production）
NODE_ENV=development
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: .env.example 添加 ACCESS_PASSWORD 配置项"
```

### Task 10: 验证完整流程

**说明：本任务不修改代码，手动验证功能。**

- [ ] **Step 1: 不设置 ACCESS_PASSWORD，启动项目确认可以正常访问**
- [ ] **Step 2: 在 .env 中设置 `ACCESS_PASSWORD=mytest123`，重启后端**
- [ ] **Step 3: 打开前端，确认显示 AuthGate 验证页面**
- [ ] **Step 4: 输入错误密码，确认显示"密码错误"**
- [ ] **Step 5: 输入正确密码 `mytest123`，确认跳转到 TTS 主界面**
- [ ] **Step 6: 刷新页面，确认无需重新输入密码（localStorage 持久化）**
- [ ] **Step 7: 打开浏览器开发者工具 → Application → localStorage，删除 `auth_token`，刷新页面确认回到验证页**
