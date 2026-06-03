# 访问密码安全验证功能

## 概述

为 MiMo TTS WebUI 添加密码验证功能，防止未授权用户使用。用户在访问页面时需输入配置的密码，验证通过后才能使用 TTS 工具。

## 需求

- 密码通过 `.env` 文件中的 `ACCESS_PASSWORD` 变量配置
- 所有 API 请求（`/api/tts` POST 和 GET）均需携带有效 token
- 前端页面加载时检查认证状态，未认证显示密码输入页面
- 验证成功后 token 存入 localStorage，刷新页面无需重新输入
- 认证令牌在后端内存中维护，服务重启后所有 token 失效

## 架构

```
[用户] → 浏览器
           │
           ├─ 未认证 → [AuthGate 组件] → POST /api/auth → 返回 token
           │                                              ↓
           └─ 已认证 → [TTS 主界面] → API 请求 + Authorization header
                                         ↓
                                   [Auth Middleware] → 校验 token
                                         ↓
                                   [TTS Route] → 正常处理
```

## 后端设计

### config.ts

新增 `accessPassword` 配置项：

```
export const config = {
  accessPassword: process.env.ACCESS_PASSWORD || '',
  ...
}
```

### routes/auth.ts（新增）

- `POST /api/auth`
- 请求体：`{ password: string }`
- 与 `config.accessPassword` 比对
- 匹配成功：使用 `crypto.randomUUID()` 生成 token，加入内存 Set，返回 `{ token }`
- 匹配失败：返回 401 `{ error: "密码错误" }`

### middleware/auth.ts（新增）

- 从 `Authorization: Bearer <token>` 提取 token
- 检查是否在有效 token 集合中
- 无效 → 返回 401 `{ error: "未授权，请先验证" }`
- 通过 → `next()`

### index.ts

- 先注册 auth 路由：`app.use('/api/auth', authRouter)`
- 应用 auth 中间件到 `/api`（排除 `/api/auth`）
- 再注册 tts 路由
- `/health` 保持公开

## 前端设计

### composables/useAuth.ts（新增，单例模式）

- 模块级 token/state，所有组件和 composable 共享同一实例
- `token`: ref 存储当前 token
- `isAuthenticated`: computed 计算属性
- `checkAuth()`: 从 localStorage 读取 token
- `login(password)`: POST /api/auth，成功后保存 token 到 localStorage
- `logout()`: 清除 token 和 localStorage

### components/AuthGate.vue（新增）

- 全屏欢迎页面风格
- 显示品牌标识 "MiMo TTS" 和应用名称
- 密码输入框
- 验证按钮（加载状态）
- 密码错误提示
- 成功验证后 emit 事件通知 App.vue

### App.vue

- `onMounted` 调用 `checkAuth()`
- 未认证 → 渲染 `<AuthGate @authenticated="onAuthenticated" />`
- 已认证 → 渲染现有主界面

### composables/useTts.ts

- 直接导入 `useAuth` 中的 token
- 所有 fetch 请求添加 `Authorization: Bearer <token>` 请求头
- 捕获 401 响应 → 调用 `logout()`

## 无额外依赖

- 后端 token 使用 Node.js 内置 `crypto.randomUUID()`
- 前端无新增 npm 包
- 总共新增约 120 行代码

## 文件变更清单

| 操作 | 文件 |
|------|------|
| 新增 | `server/src/routes/auth.ts` |
| 新增 | `server/src/middleware/auth.ts` |
| 新增 | `client/src/composables/useAuth.ts` |
| 新增 | `client/src/components/AuthGate.vue` |
| 修改 | `server/src/config.ts` |
| 修改 | `server/src/index.ts` |
| 修改 | `client/src/App.vue` |
| 修改 | `client/src/composables/useTts.ts` |
| 修改 | `.env.example` |

## .env 变更

新增可选变量：`ACCESS_PASSWORD=your_password_here`
