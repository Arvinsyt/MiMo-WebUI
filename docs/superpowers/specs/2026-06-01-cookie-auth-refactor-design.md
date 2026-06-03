# 纯 Cookie 认证重构

> 从混合 token+cookie 认证重构为纯 httpOnly Cookie 方案

## 动机

当前认证系统同时使用两种机制传递令牌：
- 服务端在登录时既设置 `auth_token` httpOnly cookie，又在 JSON 响应体中返回 token
- 客户端将 token 存入 `localStorage`，并在后续请求中通过 `Authorization: Bearer` header 发送
- 服务端中间件同时接受 Bearer header 和 cookie 两种来源

这造成了安全模型的模糊和代码的冗余。统一为纯 cookie 方式可以：
- 消除令牌泄露风险（localStorage 易受 XSS 攻击）
- 简化客户端状态管理
- 由浏览器自动处理 cookie 的发送和生命周期

## 设计方案

### 1. 服务端中间件 — `server/src/middleware/auth.ts`

`getTokenFromRequest` 函数移除 Bearer header 解析，仅保留 cookie 读取。

改前：同时检查 `Authorization: Bearer` header 和 `auth_token` cookie
改后：只从 cookie 中读取

`addToken`、`removeToken`、`isValidToken` 和 `authMiddleware` 保持不变。

### 2. 服务端路由 — `server/src/routes/auth.ts`

**`POST /auth`（登录）：**
- 保持设置 httpOnly cookie（`sameSite: 'lax'`、`path: '/'`）
- 不再在 JSON body 中返回 `{ token }`，改为返回 `{ message: '验证成功' }`

**新增 `GET /auth/check`（验证）：**
- 从 cookie 读取 token，验证是否在有效令牌集合中
- 有效返回 `{ authenticated: true }`（200）
- 无效返回 `{ error: '未授权' }`（401）
- 供客户端在页面加载时验证会话状态

**`POST /auth/logout`（登出）：**
- 保持现有逻辑不变：`clearCookie` + `removeToken`

### 3. 客户端认证状态 — `client/src/composables/useAuth.ts`

重写 composable：
- 移除 `token` ref 和 `localStorage` 读写
- `isAuthenticated` 从 `computed(() => !!token.value)` 改为独立 `ref(false)`
- `checkAuth()`：调用 `fetch('/api/auth/check')`，根据响应状态设置 `isAuthenticated`
- `login(password)`：成功后不再存储 token，仅设置 `isAuthenticated = true`
- `logout()`：调用 `fetch('/api/auth/logout')`，设置 `isAuthenticated = false`，不再发送 Bearer header

### 4. 客户端 TTS 调用 — `client/src/composables/useTts.ts`

- 移除 `useAuth` 的导入
- 移除 `Authorization: Bearer` header
- cookie 由浏览器在每次请求中自动携带
- 401 响应时直接抛出错误（不再主动调用 `logout`）

### 5. 未修改文件

以下文件接口不变，无需修改：
- `App.vue`（仅从 `useAuth` 解构 `isAuthenticated`/`checkAuth`/`logout`）
- `AuthGate.vue`（仅从 `useAuth` 解构 `login`）
- `client/src/main.ts`、`vite.config.ts`、`server/src/index.ts`、`server/src/config.ts`

### 影响范围

| 文件 | 改动类型 |
|------|---------|
| `server/src/middleware/auth.ts` | 修改（移除 Bearer 解析） |
| `server/src/routes/auth.ts` | 修改（移除返回 token + 新增 check 端点） |
| `client/src/composables/useAuth.ts` | 重写 |
| `client/src/composables/useTts.ts` | 修改（移除 Bearer header） |

共 **4 个文件**，零新增依赖。

### 安全考虑

- httpOnly cookie 不可被 JavaScript 读取，XSS 攻击无法窃取
- `sameSite: 'lax'` 防止 CSRF 跨站攻击
- 纯 cookie 方案与现有 Vite 开发代理（`changeOrigin: true`）兼容，cookie 在浏览器和代理之间正常传递
