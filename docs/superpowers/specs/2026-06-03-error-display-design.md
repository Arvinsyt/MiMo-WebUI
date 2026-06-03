# 统一错误显示方案

## 概述

为 MiMo TTS WebUI 添加统一的 Toast 通知系统，替代现有的零散 inline 错误显示，覆盖所有用户操作的错误和成功反馈。

## 架构变更

```
之前: inline error-box (App.vue) + inline error-msg (AuthGate.vue) + 静默吞掉 (AudioPlayer/auth/logout)
之后: 模块级 useNotification composable → ToastContainer 统一渲染
```

### 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `client/src/composables/useNotification.ts` | 新增 | 通知 composable（模块级单例） |
| `client/src/components/ToastContainer.vue` | 新增 | toast 渲染组件 |
| `client/src/App.vue` | 修改 | 集成 ToastContainer，移除 inline error-box |
| `client/src/components/AuthGate.vue` | 修改 | 登录失败改用 toast，移除 inline error-msg |
| `client/src/composables/useTts.ts` | 修改 | 错误和成功均通过 toast 通知 |
| `client/src/composables/useAuth.ts` | 修改 | checkAuth/logout 错误通过 toast 通知 |
| `client/src/components/AudioPlayer.vue` | 修改 | 解码失败通过 toast 通知 |

## 通知系统

### useNotification composable

模块级单例 composable（与 `useAuth.ts` 的 `isAuthenticated` 相同模式），导入即共享同一状态。

```typescript
interface Notification {
  id: number
  type: 'error' | 'success' | 'info'
  message: string
}

// 返回值
{
  notifications: Ref<Notification[]>  // 响应式通知列表
  showError(msg: string): void        // 推送错误通知
  showSuccess(msg: string): void      // 推送成功通知
  showInfo(msg: string): void         // 推送信息通知
  remove(id: number): void            // 手动移除通知
}
```

- 内部自动递增 `id`
- 推送后 4 秒自动移除
- 移除时调用 `remove(id)` 清理

### ToastContainer 组件

- 渲染位置：`App.vue` 顶层，`<AuthGate>` 之前（不受认证状态切换影响）
- 定位：`position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999`
- 动画：`TransitionGroup` 实现进场/离场过渡
- 三种类型：error（红色）、success（绿色）、info（蓝色）
- 每个通知：图标 + 消息文字 + 关闭按钮
- 自动 4 秒消失，点击关闭可提前移除

#### 新增 CSS 变量

```css
--color-success: #4caf50;
--color-success-bg: #edf7ed;
--color-info: #2196f3;
--color-info-bg: #e3f2fd;
```

## 集成点

### useTts.ts
- 成功：`showSuccess('语音生成成功')`
- 失败：`showError(err.message || '未知错误')`
- 移除 `error` ref 和相关导出（不再需要 inline 渲染）

### AuthGate.vue
- 登录成功：`showSuccess('验证成功，欢迎回来')`
- 登录失败：`showError(err.message || '验证失败')`
- 移除本地 `error` ref 和相关 template/样式

### useAuth.ts
- `checkAuth()` catch：`showError('无法连接服务器')`
- `logout()` catch：`showError('退出失败')`

### AudioPlayer.vue
- `decodeAudioData` catch：`showError('音频解码失败')`

### App.vue
- 顶层集成 `<ToastContainer />`
- 移除 `.error-box` 相关 template 和样式
- 移除 `error` 相关的 props/变量

## 流程

```
用户操作 → composable/组件 try/catch
  ├─ 成功 → showSuccess(msg)
  └─ 失败 → showError(msg)
           → notifications 响应式更新
           → ToastContainer 渲染通知
           → 4 秒后自动移除
```

## 测试验收

1. 输入文本生成 TTS，确认成功 toast 显示
2. 服务器断开时生成 TTS，确认错误 toast 显示
3. 输入错误密码登录，确认错误 toast 显示
4. 正确密码登录，确认成功 toast 显示
5. 重复操作确认 toast 不重叠堆积
6. 点击关闭按钮确认提前消失
7. 切换认证状态（登录→登出）确认 toast 不受影响
