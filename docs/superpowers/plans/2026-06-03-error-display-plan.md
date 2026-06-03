# 统一错误显示实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 MiMo TTS WebUI 添加统一的 Toast 通知系统，替代所有零散 inline 错误显示

**Architecture:** 模块级单例 composable (`useNotification`) 管理通知队列，`ToastContainer` 在 App.vue 顶层渲染，各组件通过 composable 触发通知

**Tech Stack:** Vue 3 + TypeScript，零外部依赖

---

### Task 1: 创建 useNotification composable

**Files:**
- Create: `client/src/composables/useNotification.ts`

- [ ] **Step 1: 编写 useNotification.ts**

```typescript
import { ref } from 'vue'

type NotificationType = 'error' | 'success' | 'info'

export interface Notification {
  id: number
  type: NotificationType
  message: string
}

const notifications = ref<Notification[]>([])
let nextId = 0

export function useNotification() {
  function add(type: NotificationType, message: string) {
    const id = ++nextId
    notifications.value = [...notifications.value, { id, type, message }]
    setTimeout(() => remove(id), 4000)
  }

  function remove(id: number) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  function showError(msg: string) { add('error', msg) }
  function showSuccess(msg: string) { add('success', msg) }
  function showInfo(msg: string) { add('info', msg) }

  return { notifications, showError, showSuccess, showInfo, remove }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/composables/useNotification.ts
git commit -m "feat: add useNotification composable for toast notifications"
```

### Task 2: 创建 ToastContainer 组件

**Files:**
- Create: `client/src/components/ToastContainer.vue`

- [ ] **Step 1: 编写 ToastContainer.vue**

```vue
<script setup lang="ts">
import { useNotification } from '../composables/useNotification'
import { TransitionGroup } from 'vue'

const { notifications, remove } = useNotification()
</script>

<template>
  <TransitionGroup name="toast" tag="div" class="toast-container">
    <div
      v-for="n in notifications"
      :key="n.id"
      class="toast"
      :class="`toast--${n.type}`"
      @click="remove(n.id)"
    >
      <svg v-if="n.type === 'error'" class="toast-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" />
      </svg>
      <svg v-else-if="n.type === 'success'" class="toast-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
      </svg>
      <svg v-else class="toast-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9.75 7.5a.75.75 0 0 0 0 1.5h.75v4.5a.75.75 0 0 0 1.5 0V9a.75.75 0 0 0-.75-.75H9.75Z" clip-rule="evenodd" />
        <path d="M9.75 5.25a.75.75 0 0 0 0 1.5h.008a.75.75 0 0 0 0-1.5H9.75Z" />
      </svg>
      <span class="toast-text">{{ n.message }}</span>
      <button class="toast-close" @click.stop="remove(n.id)">
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: 420px;
  width: 100%;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  word-break: break-word;
}

.toast--error {
  background: var(--color-error-bg, #fdf0ed);
  color: var(--color-error-text, #c0392b);
  border: 1px solid rgba(192, 57, 43, 0.15);
}

.toast--success {
  background: var(--color-success-bg, #edf7ed);
  color: var(--color-success-text, #2e7d32);
  border: 1px solid rgba(76, 175, 80, 0.15);
}

.toast--info {
  background: var(--color-info-bg, #e3f2fd);
  color: var(--color-info-text, #1565c0);
  border: 1px solid rgba(33, 150, 243, 0.15);
}

.toast-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.toast-text {
  flex: 1;
}

.toast-close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s;
  color: inherit;
}

.toast-close:hover {
  opacity: 1;
}

.toast-enter-active {
  animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-leave-active {
  animation: toastOut 0.2s ease-in;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(-16px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-12px) scale(0.95);
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ToastContainer.vue
git commit -m "feat: add ToastContainer component for unified notifications"
```

### Task 3: 在 :root 新增颜色变量

**Files:**
- Modify: `client/src/App.vue:134-152`

- [ ] **Step 1: 在 App.vue 的 :root 中添加成功/信息颜色变量**

Edit `client/src/App.vue` — in the `:root` block (around line 134-152), add new variables after `--color-error-text`:

Old:
```css
--color-error-text: #c0392b;
```

New:
```css
--color-error-text: #c0392b;
--color-success-bg: #edf7ed;
--color-success-text: #2e7d32;
--color-info-bg: #e3f2fd;
--color-info-text: #1565c0;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/App.vue
git commit -m "style: add success and info color CSS variables"
```

### Task 4: 集成 ToastContainer 到 App.vue，移除 inline error-box

**Files:**
- Modify: `client/src/App.vue`

- [ ] **Step 1: 在 App.vue template 顶层添加 ToastContainer**

Add the import at the top of `<script setup>`:
```typescript
import ToastContainer from './components/ToastContainer.vue'
```

Add `<ToastContainer />` as the first child of `<template>` (before `<AuthGate>`):
```vue
<template>
  <ToastContainer />
  <AuthGate v-if="!isAuthenticated" @authenticated="onAuthenticated" />
  ...
```

- [ ] **Step 2: 移除 error-box 相关模板**

Remove the entire `<div v-if="error" class="error-box">` block (lines 121-126):
```vue
          <!-- DELETE these lines:
          <div v-if="error" class="error-box">
            <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
              ...
            </svg>
            <span>{{ error }}</span>
          </div>
          -->
```

- [ ] **Step 3: 更新 script 解构，移除 error**

Change line 18:
```typescript
const { isLoading, audioBuffer, generateTts } = useTts()
```

- [ ] **Step 4: 移除相关 scoped 样式**

Remove `.error-box` and `.error-icon` CSS classes (lines 478-496).

- [ ] **Step 5: Commit**

```bash
git add client/src/App.vue
git commit -m "feat: integrate ToastContainer and remove inline error display"
```

### Task 5: 更新 useTts.ts — 使用 toast 通知

**Files:**
- Modify: `client/src/composables/useTts.ts`

- [ ] **Step 1: 替换 useTts.ts 实现**

Old content (entire file):
```typescript
import { ref } from 'vue'
import type { TtsRequest } from '@/types'
export function useTts() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const audioBuffer = ref<ArrayBuffer | null>(null)
  async function generateTts(request: TtsRequest): Promise<void> {
    isLoading.value = true
    error.value = null
    audioBuffer.value = null
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      if (response.status === 401) {
        throw new Error('认证已过期，请重新验证')
      }
      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error || `请求失败: ${response.status}`)
      }
      audioBuffer.value = await response.arrayBuffer()
    } catch (err: any) {
      error.value = err.message || '未知错误'
    } finally {
      isLoading.value = false
    }
  }
  return { isLoading, error, audioBuffer, generateTts }
}
```

New content:
```typescript
import { ref } from 'vue'
import type { TtsRequest } from '@/types'
import { useNotification } from './useNotification'
export function useTts() {
  const isLoading = ref(false)
  const audioBuffer = ref<ArrayBuffer | null>(null)

  const { showError, showSuccess } = useNotification()

  async function generateTts(request: TtsRequest): Promise<void> {
    isLoading.value = true
    audioBuffer.value = null
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      if (response.status === 401) {
        throw new Error('认证已过期，请重新验证')
      }
      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error || `请求失败: ${response.status}`)
      }
      audioBuffer.value = await response.arrayBuffer()
      showSuccess('语音生成成功')
    } catch (err: any) {
      showError(err.message || '未知错误')
    } finally {
      isLoading.value = false
    }
  }
  return { isLoading, audioBuffer, generateTts }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/composables/useTts.ts
git commit -m "feat: use toast notifications for TTS success/error"
```

### Task 6: 更新 AuthGate.vue — 移除 inline error，使用 toast

**Files:**
- Modify: `client/src/components/AuthGate.vue`

- [ ] **Step 1: 更新 script 部分 — 导入 useNotification**

Add import (after `import { useAuth } from '../composables/useAuth'`):
```typescript
import { useNotification } from '../composables/useNotification'
```

In the `setup` block, add notification and update handleSubmit:
```typescript
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
```

Remove `const error = ref('')` and `error.value = ''` and `error.value = err.message...`.

- [ ] **Step 2: 移除 template 中的 error-msg 块**

Remove the entire `<Transition name="error-fade">` block and its `error-msg` / `error-icon` CSS classes from `<style scoped>`.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/AuthGate.vue
git commit -m "feat: use toast for auth errors and success"
```

### Task 7: 更新 useAuth.ts — 添加 checkAuth/logout 错误 toast

**Files:**
- Modify: `client/src/composables/useAuth.ts`

- [ ] **Step 1: 更新 useAuth.ts**

Old content (entire file):
```typescript
import { ref } from 'vue'

const isAuthenticated = ref(false)

export function useAuth() {
  function checkAuth() {
    fetch('/api/auth/check')
      .then(res => { isAuthenticated.value = res.ok })
      .catch(() => { isAuthenticated.value = false })
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
    isAuthenticated.value = true
    return true
  }

  function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
    isAuthenticated.value = false
  }

  return { isAuthenticated, checkAuth, login, logout }
}
```

New content:
```typescript
import { ref } from 'vue'
import { useNotification } from './useNotification'

const isAuthenticated = ref(false)

export function useAuth() {
  const { showError } = useNotification()

  function checkAuth() {
    fetch('/api/auth/check')
      .then(res => { isAuthenticated.value = res.ok })
      .catch(() => {
        isAuthenticated.value = false
        showError('无法连接服务器')
      })
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
    isAuthenticated.value = true
    return true
  }

  function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
      .catch(() => showError('退出失败'))
    isAuthenticated.value = false
  }

  return { isAuthenticated, checkAuth, login, logout }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/composables/useAuth.ts
git commit -m "feat: add toast for auth check/logout errors"
```

### Task 8: 更新 AudioPlayer.vue — 解码失败 toast

**Files:**
- Modify: `client/src/components/AudioPlayer.vue`

- [ ] **Step 1: 添加 useNotification 导入并在 catch 中调用**

At the top of `<script setup>`, add the import (after the existing imports):
```typescript
import { useNotification } from '../composables/useNotification'
```

After the imports, add:
```typescript
const { showError } = useNotification()
```

In the `watch(() => props.audioBuffer, ...)` callback, change the empty catch:

Old:
```typescript
    } catch {
      decodedBuffer = null
      return
    }
```

New:
```typescript
    } catch {
      decodedBuffer = null
      showError('音频解码失败')
      return
    }
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/AudioPlayer.vue
git commit -m "feat: show toast when audio decode fails"
```

### Task 9: 验证构建

- [ ] **Step 1: 运行 TypeScript 检查**

```bash
npx vue-tsc --noEmit
```
Expected: No type errors

- [ ] **Step 2: 运行构建**

```bash
npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve type/build issues"
```
