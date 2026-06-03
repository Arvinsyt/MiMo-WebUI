# 退出登录功能

## 概述

在已登录的主界面中添加退出登录按钮，允许用户主动退出。退出后 token 在客户端和服务端同时失效，页面返回登录验证页。

## 需求

- 主界面 header 右侧「就绪」状态旁添加退出按钮（图标 + 文字）
- 点击后立即退出，无确认弹窗
- 退出后后端 token 失效，后续 API 请求返回 401
- 前端清除 token，页面返回 AuthGate 登录页

## 架构

```
[退出按钮点击] → logout()
                    │
                    ├─ POST /api/auth/logout (后端使 token 失效)
                    │        ↓
                    │  removeToken(token) → 从内存 Set 删除
                    │
                    └─ 清除 localStorage + token ref
                             ↓
                    isAuthenticated=false → AuthGate 重新显示
```

## 后端设计

### routes/auth.ts

新增 `POST /api/auth/logout`：

```typescript
router.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未授权' })
    return
  }
  const token = authHeader.slice(7)
  removeToken(token)
  res.json({ message: '已退出登录' })
})
```

仅在 `ACCESS_PASSWORD` 已配置时启用。路由已在 `/api/auth` 前缀下，不会被 auth middleware 拦截。

### middleware/auth.ts

无需修改，已有 `removeToken` 导出。

## 前端设计

### composables/useAuth.ts

在现有 `logout()` 方法中添加调用退出登录接口（fire-and-forget，不等待服务端响应）：

```typescript
function logout() {
  fetch('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.value}` }
  }).finally(() => {
    token.value = null
    localStorage.removeItem('auth_token')
  })
}
```

### App.vue

header 中「就绪」状态右侧添加退出按钮：

- 图标：退出/门图标（与现有 SVG 风格一致）
- 文字：退出
- 样式：浅色文字，悬停变色，与 header-status 对齐
- 点击调用 `logout()`

```html
<button class="logout-btn" @click="logout" title="退出登录">
  <svg><!-- 退出图标 --></svg>
  <span>退出</span>
</button>
```

样式：
- 透明背景，无边框
- 文字颜色 `var(--color-text-secondary)`
- 悬停时颜色 `var(--color-primary-dark)`

## 无额外依赖

- 所有功能使用现有框架和标准库
- 不新增 npm 包

## 文件变更清单

| 操作 | 文件 |
|------|------|
| 修改 | `server/src/routes/auth.ts` |
| 修改 | `client/src/composables/useAuth.ts` |
| 修改 | `client/src/App.vue` |

