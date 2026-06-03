# Cookie 认证设计

## 概述

在现有 Bearer Token 认证基础上，增加 HTTP-only Cookie 机制，使得登录后直接在浏览器地址栏访问 API URL 也能通过认证。退出时同时清除服务端 token 和浏览器 cookie。

## 问题

用户通过 SPA 登录后，token 存在 `localStorage` 中。直接在浏览器地址栏访问 `GET /api/tts?text=...&voiceId=...` 时，浏览器不会自动发送 `Authorization` 头，导致返回 401 未授权。

## 方案

**HTTP-only Cookie + Bearer Token 双认证**。登录时服务端额外设置 HTTP-only cookie。Auth 中间件同时检查 `Authorization: Bearer` 头和 `Cookie: auth_token=xxx`，任一有效即放行。

### 架构

```
登录 POST /api/auth → 返回 token JSON + Set-Cookie: auth_token=xxx
                 ↓
SPA 请求: Authorization: Bearer xxx  (不变)
浏览器访问: Cookie: auth_token=xxx   (自动携带)
                 ↓
auth 中间件 → 先查 Bearer → 再查 Cookie → 任一有效 → next()
                 ↓
退出 POST /api/auth/logout → removeToken + Clear-Cookie
```

## 后端设计

### auth 中间件 — middleware/auth.ts

新增 `getTokenFromRequest()` 函数，从请求中提取 token（优先 Bearer 头，其次 Cookie）：

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

`authMiddleware` 中使用 `getTokenFromRequest` 替代原先的 `authHeader.slice(7)`。

### 登录 — routes/auth.ts

`POST /api/auth` 中生成 token 后增加 `Set-Cookie`：

```typescript
res.cookie('auth_token', token, {
  httpOnly: true,
  sameSite: 'lax',
  path: '/'
})
res.json({ token })
```

Express 4 内置 `res.cookie()`，无需额外依赖。

### 退出 — routes/auth.ts

`POST /api/auth/logout` 中同时检查 Bearer 头和 Cookie，清除 token 和 cookie：

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

## 前端设计

无需修改。SPA 继续使用 `Authorization: Bearer <token>` 头发送请求。

## 文件变更清单

| 操作 | 文件 |
|------|------|
| 修改 | `server/src/middleware/auth.ts` |
| 修改 | `server/src/routes/auth.ts` |

## 安全说明

- Cookie 为 `httpOnly`，JavaScript 不可读取，防止 XSS 窃取
- `sameSite: 'lax'`，允许同站导航携带 cookie，阻止跨站请求伪造
- SPA 仍使用 Bearer 头，不受 CSRF 影响
- 无新增 npm 依赖
