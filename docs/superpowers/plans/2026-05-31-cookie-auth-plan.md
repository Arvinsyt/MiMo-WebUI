# Cookie 认证实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Bearer Token 认证基础上增加 HTTP-only Cookie 支持，使登录后浏览器直接访问 API URL 也能通过认证

**Architecture:** auth 中间件同时检查 `Authorization: Bearer` 头和 `Cookie: auth_token=xxx`；登录时设置 cookie；退出时清除 cookie 和服务端 token

**Tech Stack:** Express 4, TypeScript

---

### Task 1: Auth 中间件 — 支持 Cookie 提取 Token

**Files:**
- Modify: `server/src/middleware/auth.ts`

- [ ] **Step 1: 新增 `getTokenFromRequest()` 函数**

在 `server/src/middleware/auth.ts` 中已有导入之后、`addToken` 之前添加：

```typescript
function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  const cookie = req.headers.cookie
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)auth_token=([^;]*)/)
    if (match) return match[1]
  }

  return null
}
```

- [ ] **Step 2: 更新 `authMiddleware` 使用新函数**

将 `authMiddleware` 中第 21-24 行的 bearer 解析逻辑替换为调用 `getTokenFromRequest`：

```typescript
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!config.accessPassword) return next()

  const token = getTokenFromRequest(req)
  if (!token) {
    res.status(401).json({ error: '未授权，请先验证' })
    return
  }

  if (!isValidToken(token)) {
    res.status(401).json({ error: '未授权，请先验证' })
    return
  }

  next()
}
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd server && npx tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 4: 提交**

```bash
git add server/src/middleware/auth.ts
git commit -m "feat(auth): support cookie-based token extraction in auth middleware"
```

---

### Task 2: 登录/退出接口 — Cookie 管理

**Files:**
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: 登录接口设置 Cookie**

在 `POST /api/auth` 的 `res.json({ token })` 之前添加 `res.cookie`：

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
  res.json({ token })
})
```

- [ ] **Step 2: 退出接口同时检查 Cookie**

将 `POST /api/auth/logout` 改为同时检查 Bearer 头和 Cookie：

```typescript
router.post('/auth/logout', (req: Request, res: Response) => {
  let token: string | null = null

  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }

  if (!token) {
    const cookie = req.headers.cookie
    if (cookie) {
      const match = cookie.match(/(?:^|;\s*)auth_token=([^;]*)/)
      if (match) token = match[1]
    }
  }

  if (!token) {
    res.status(401).json({ error: '未授权' })
    return
  }

  removeToken(token)
  res.clearCookie('auth_token', { path: '/' })
  res.json({ message: '已退出登录' })
})
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd server && npx tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 4: 提交**

```bash
git add server/src/routes/auth.ts
git commit -m "feat(auth): set/clear auth cookie on login/logout"
```

---

### Task 3: 手动验证

- [ ] **Step 1: 启动服务**

```bash
npm run dev
```

- [ ] **Step 2: 通过 SPA 登录**

打开浏览器访问 `http://localhost:10086`，输入密码登录

- [ ] **Step 3: 浏览器直接访问 API URL**

打开新标签页，访问 `http://localhost:10086/api/tts?text=你好&voiceId=冰糖`，验证返回 JSON 而不是 401

- [ ] **Step 4: 退出后验证**

在 SPA 中点击退出，然后在新标签页再次访问 API URL，验证返回 401 `{"error":"未授权，请先验证"}`
