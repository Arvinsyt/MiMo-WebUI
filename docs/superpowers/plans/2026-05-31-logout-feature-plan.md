# 退出登录功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在主界面添加退出登录按钮，退出后 token 在客户端和服务端同时失效

**Architecture:** 服务端新增 `POST /api/auth/logout` 将 token 从内存 Set 移除；前端 `logout()` 先调用服务端接口再清除 localStorage；header 右侧添加退出按钮

**Tech Stack:** Vue 3 (Composition API) + TypeScript, Express 4 + TypeScript

---

### Task 1: 服务端退出登录接口

**Files:**
- Modify: `server/src/routes/auth.ts`
- Modify: `server/src/middleware/auth.ts`（仅添加导出 `removeToken` 的 import）

- [ ] **Step 1: 在 auth.ts 中添加 logout 路由**

在 `server/src/routes/auth.ts` 中：

将 import 从仅 `addToken` 改为导入 `addToken, removeToken`：

```typescript
import { addToken, removeToken } from '../middleware/auth.js'
```

在 `router.post('/auth', ...)` 之后添加：

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

- [ ] **Step 2: 验证服务端编译通过**

```bash
cd server && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: 提交**

```bash
git add server/src/routes/auth.ts
git commit -m "feat: 添加 POST /api/auth/logout 退出登录接口"
```

---

### Task 2: 前端退出逻辑

**Files:**
- Modify: `client/src/composables/useAuth.ts`

- [ ] **Step 1: 更新 logout 方法**

在 `client/src/composables/useAuth.ts` 中，将 `logout()` 替换为：

```typescript
function logout() {
  const currentToken = token.value
  token.value = null
  localStorage.removeItem('auth_token')
  if (currentToken) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentToken}` }
    })
  }
}
```

注意：先清除本地状态确保 UI 立即响应，再异步通知服务端使 token 失效。

- [ ] **Step 2: 验证前端编译通过**

```bash
cd client && npx vue-tsc --noEmit
```
Expected: No type errors

- [ ] **Step 3: 提交**

```bash
git add client/src/composables/useAuth.ts
git commit -m "feat: logout 时同步使服务端 token 失效"
```

---

### Task 3: 退出登录按钮 UI

**Files:**
- Modify: `client/src/App.vue`

- [ ] **Step 1: 在 App.vue 中添加退出按钮**

在 `<script setup>` 中，从 useAuth 解构出 `logout`：

```typescript
const { isAuthenticated, checkAuth, logout } = useAuth()
```

在 template 的 header 中，`<div class="header-status">` 之后添加：

```html
<button class="logout-btn" @click="logout" title="退出登录">
  <svg class="logout-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15 6l4 4-4 4" />
    <path d="M9 10h9" />
    <path d="M4 4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2" />
  </svg>
  <span>退出</span>
</button>
```

在 scoped style 中添加样式：

```css
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
  margin-left: 8px;
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
```

将 header-inner 中的 header-status 和 logout-btn 包在一个 flex 容器中（使它们水平对齐）：

```html
<div class="header-inner">
  <div class="header-brand">...</div>
  <div class="header-actions">
    <div class="header-status">...</div>
    <button class="logout-btn" ...>...</button>
  </div>
</div>
```

添加样式：

```css
.header-actions {
  display: flex;
  align-items: center;
  gap: 0;
}
```

- [ ] **Step 2: 验证前端编译通过**

```bash
cd client && npx vue-tsc --noEmit
```
Expected: No type errors

- [ ] **Step 3: 提交**

```bash
git add client/src/App.vue
git commit -m "feat: header 添加退出登录按钮"
```

---

### Task 4: 最终验证

- [ ] **Step 1: 启动完整项目**

```bash
cd /home/Code/Mimo-WebUI && npm run dev
```

- [ ] **Step 2: 验证功能**

1. 打开浏览器访问页面，确认看到 AuthGate 登录页
2. 输入正确密码，进入主界面
3. 确认 header 右侧有退出按钮
4. 点击退出按钮，确认立即回到 AuthGate 页
5. 刷新浏览器，确认仍在 AuthGate 页（token 已清除）
6. 重新登录，确认仍可正常使用
