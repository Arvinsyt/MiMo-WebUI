# 纯 Cookie 认证重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有混合 token+cookie 认证重构为纯 httpOnly Cookie 方案，消除 localStorage 和 Bearer header 的使用

**Architecture:** 服务端 `getTokenFromRequest` 只从 cookie 读取令牌；登录端点不再返回 token 到 JSON body；新增 `GET /auth/check` 供客户端验证 cookie；客户端移除所有 token 存储和 Bearer header 发送

**Tech Stack:** Express 4, TypeScript, Vue 3

---

### Task 1: 服务端中间件 — 移除 Bearer header 解析

**Files:**
- Modify: `server/src/middleware/auth.ts`

- [ ] **Step 1: 修改 `getTokenFromRequest()` 只读 cookie**

将函数体中的 Bearer header 解析逻辑移除，只保留 cookie 读取：

```typescript
export function getTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.cookie
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)auth_token=([^;]*)/)
    if (match) return match[1]
  }
  return null
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd server && npx tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 3: 提交**

```bash
git add server/src/middleware/auth.ts
git commit -m "refactor(auth): remove Bearer token parsing, only read cookie"
```

---

### Task 2: 服务端路由 — 移除 token 返回 + 新增 check 端点

**Files:**
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: 登录 `POST /auth` 不再返回 token**

将 `res.json({ token })` 改为纯消息响应：

```typescript
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
  res.cookie('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  })
  res.json({ message: '验证成功' })
})
```

- [ ] **Step 2: 新增 `GET /auth/check` 端点**

在 `POST /auth/logout` 之后添加：

```typescript
router.get('/auth/check', (req: Request, res: Response) => {
  const token = getTokenFromRequest(req)
  if (!token || !isValidToken(token)) {
    res.status(401).json({ error: '未授权' })
    return
  }
  res.json({ authenticated: true })
})
```

- [ ] **Step 3: 简化 `POST /auth/logout`**

移除 logout 中重复的 inline token 提取逻辑，改用 `getTokenFromRequest`：

```typescript
router.post('/auth/logout', (req: Request, res: Response) => {
  const token = getTokenFromRequest(req)

  if (!token || !isValidToken(token)) {
    res.status(401).json({ error: '未授权' })
    return
  }

  removeToken(token)
  res.clearCookie('auth_token', { path: '/' })
  res.json({ message: '已退出登录' })
})
```

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
cd server && npx tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 5: 提交**

```bash
git add server/src/routes/auth.ts
git commit -m "refactor(auth): remove token from login response, add /auth/check endpoint"
```

---

### Task 3: 客户端 useAuth — 移除 localStorage 和 token 状态

**Files:**
- Modify: `client/src/composables/useAuth.ts`

- [ ] **Step 1: 重写 `useAuth.ts`**

将整个文件替换为纯 cookie 实现：

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

- [ ] **Step 2: 验证构建**

```bash
cd client && npx vue-tsc -b
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add client/src/composables/useAuth.ts
git commit -m "refactor(auth): switch to pure cookie auth, remove localStorage token"
```

---

### Task 4: 客户端 useTts — 移除 Bearer header

**Files:**
- Modify: `client/src/composables/useTts.ts`

- [ ] **Step 1: 移除 `useAuth` 导入和 Bearer header**

```typescript
import { ref } from 'vue'
import type { TtsRequest, TtsResponse } from '@/types'

export function useTts() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const audioBase64 = ref<string | null>(null)

  async function generateTts(request: TtsRequest): Promise<void> {
    isLoading.value = true
    error.value = null
    audioBase64.value = null

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

- [ ] **Step 2: 验证构建**

```bash
cd client && npx vue-tsc -b
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add client/src/composables/useTts.ts
git commit -m "refactor(auth): remove Bearer header from TTS API calls"
```

---

### Task 5: 手动验证完整流程

- [ ] **Step 1: 启动开发服务**

```bash
npm run dev
```

- [ ] **Step 2: 测试登录流程**

打开浏览器访问 `http://localhost:10086`，输入密码登录，确认页面跳转到主界面

- [ ] **Step 3: 测试刷新后保持认证**

按 F5 刷新页面，确认不会回到登录页（cookie 通过 `GET /auth/check` 验证）

- [ ] **Step 4: 测试 TTS 生成**

输入文本，选择音色，点击生成语音，确认语音正常生成和播放

- [ ] **Step 5: 测试退出**

点击退出按钮，确认返回登录页。刷新后确认仍停留在登录页

- [ ] **Step 6: 验证无 localStorage token 残留**

打开浏览器开发者工具 → Application → Local Storage，确认 `<origin>` 下无 `auth_token` 条目

- [ ] **Step 7: 验证 API 直接访问**

在新标签页中直接访问 `http://localhost:10086/api/tts?text=你好&voiceId=冰糖`，确认返回非 401 响应（因为 cookie 自动携带）
