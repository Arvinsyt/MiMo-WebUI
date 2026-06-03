# MiMo TTS WebUI 项目文档

## 目录

- [项目概述](#项目概述)
- [认证流程](#认证流程)
- [API 详细文档](#api-详细文档)
- [前端组件](#前端组件)
- [部署指南](#部署指南)
- [开发指南](#开发指南)

---

## 项目概述

MiMo TTS WebUI 是一个为 MiMo V2.5 TTS 模型打造的现代化 Web 界面，提供文本转语音（TTS）服务。

### 项目结构

| 目录/文件 | 说明 |
|-----------|------|
| `client/` | Vue 3 SPA 前端，基于 Vite 6 构建 |
| `server/` | Express 4 TypeScript 后端，ESM 模块 |
| `server/src/cache.ts` | LRU 音频缓存（50条，SHA-256 键） |
| `.env.example` | 环境变量模板 |
| `package.json` | 根工作区脚本（concurrently 协调前后端） |

### 技术栈明细

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 (Composition API + `<script setup>`) | ^3.5.0 |
| 构建工具 | Vite | ^6.0.0 |
| 类型检查 | vue-tsc | ^2.2.0 |
| 后端框架 | Express | ^4.21.0 |
| 运行时 | tsx（开发）/ Node.js（生产） | ^4.19.0 |
| 跨域 | cors | ^2.8.5 |
| 环境变量 | dotenv | ^16.4.7 |

---

## 认证流程

系统采用 **Cookie 令牌鉴权** 方案，前后端无状态协作。

### 流程图示

```
┌──────────┐          ┌──────────┐
│  客户端   │          │  服务端   │
│ (Vue SPA) │          │ (Express) │
└────┬─────┘          └────┬─────┘
     │                      │
     │  GET /api/auth/check │
     │─────────────────────>│
     │   401 Unauthorized   │
     │<─────────────────────│
     │                      │
     │  POST /api/auth      │
     │  { password: "..." } │
     │─────────────────────>│
     │   Set-Cookie:        │
     │   auth_token=<uuid>  │
     │<─────────────────────│
     │                      │
      │  POST /api/tts       │
      │  Cookie: auth_token= │
      │─────────────────────>│
      │  audio/wav 字节流    │
      │<─────────────────────│
     │                      │
     │  POST /api/auth/logout│
     │─────────────────────>│
     │  Clear-Cookie        │
     │<─────────────────────│
```

### 关键设计点

- 令牌存储在服务端内存 `Set<string>` 中，服务重启后所有会话失效
- Cookie 为 `httpOnly`，前端无法通过 JavaScript 读取，防止 XSS 窃取
- `sameSite: 'lax'` 允许在导航上下文中附带 Cookie
- 未配置 `ACCESS_PASSWORD` 时，auth 中间件直接放行（跳过鉴权）
- 前端 `useAuth` composable 管理认证状态，页面加载时自动调用 `/api/auth/check` 验证会话

---

## API 详细文档

### POST /api/auth

密码登录，获取授权 Cookie。

**请求体：**

```json
{
  "password": "your_password"
}
```

**成功响应（200）：**

```json
{
  "message": "验证成功"
}
```

**错误响应：**

| 状态码 | 条件 | 响应 |
|--------|------|------|
| 400 | 密码为空 | `{ "error": "密码不能为空" }` |
| 401 | 密码错误 | `{ "error": "密码错误" }` |
| 500 | 未配置 ACCESS_PASSWORD | `{ "error": "服务未配置访问密码..." }` |

**Set-Cookie：** `auth_token=<uuid>; HttpOnly; SameSite=Lax; Path=/`

---

### POST /api/auth/logout

注销当前会话，清除 Cookie。

**鉴权：** 需要有效 Cookie

**请求头：** `Cookie: auth_token=<uuid>`

**成功响应（200）：**

```json
{
  "message": "已退出登录"
}
```

**错误响应（401）：**

```json
{
  "error": "未授权"
}
```

---

### GET /api/auth/check

验证当前会话是否有效。

**鉴权：** 需要有效 Cookie

**请求头：** `Cookie: auth_token=<uuid>`

**成功响应（200）：**

```json
{
  "authenticated": true
}
```

**错误响应（401）：**

```json
{
  "error": "未授权"
}
```

---

### POST /api/tts

提交文本与音色参数，生成语音。

**鉴权：** 需要有效 Cookie

**请求体：**

```json
{
  "text": "你好，今天天气真好",
  "voiceId": "冰糖",
  "styleMode": "natural",
  "stylePrompt": "用温暖的微笑轻声说话",
  "styleTag": ""
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | 是 | 待合成的文本 |
| `voiceId` | string | 是 | 音色 ID（如 `冰糖`、`Mia`） |
| `styleMode` | string | 否 | 风格模式：`natural` 或 `tag` |
| `stylePrompt` | string | 否 | 自然语言风格描述（`natural` 模式） |
| `styleTag` | string | 否 | 预设风格标签（`tag` 模式） |

**成功响应（200）：**

返回 `Content-Type: audio/wav` 的原始 WAV 二进制字节流，可直接解码播放或保存为 `.wav` 文件。

**错误响应：**

| 状态码 | 条件 | 响应 |
|--------|------|------|
| 400 | 文本为空 | `{ "error": "合成文本不能为空" }` |
| 500 | API Key 未配置 | `{ "error": "API Key 未配置..." }` |
| 500 | MiMo API 错误 | `{ "error": "MiMo API 错误: ..." }` |

---

### GET /api/tts

以查询参数方式调用 TTS。

**鉴权：** 需要有效 Cookie

**查询参数：**

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `text` | 是 | — | 待合成的文本 |
| `voiceId` | 否 | `冰糖` | 音色 ID |
| `styleMode` | 否 | — | 风格模式 |
| `stylePrompt` | 否 | — | 自然语言风格描述 |
| `styleTag` | 否 | — | 预设风格标签 |
| `raw` | 否 | — | 设为 `true` 时额外添加 `Content-Disposition` 文件头 |

**响应（200）：** `Content-Type: audio/wav`，直接返回 WAV 二进制数据（与 POST 行为一致）。`raw=true` 时响应头含 `Content-Disposition: inline; filename="tts-output.wav"`，便于浏览器直接识别为音频文件。

---

### GET /health

健康检查端点。

**无需鉴权。**

**响应（200）：**

```json
{
  "status": "ok",
  "apiKeyConfigured": true
}
```

---

## 音频缓存机制

服务端维护一个 LRU（Least Recently Used）缓存，避免重复请求消耗 MiMo API 配额。

| 配置 | 值 |
|------|----|
| 缓存容量 | 最多 50 条音频 |
| 淘汰策略 | LRU，超出容量时淘汰最久未访问条目 |
| 缓存键 | `SHA-256(text \| voiceId \| styleMode \| stylePrompt \| styleTag)` |
| 实现文件 | `server/src/cache.ts` |

### MiMo API 调用细节

| 字段 | 值 |
|------|----|
| API 端点 | `https://api.xiaomimimo.com/v1/chat/completions` |
| 模型 | `mimo-v2.5-tts` |
| 鉴权方式 | HTTP Header `api-key`（对应 `MIMO_API_KEY`） |
| 音频格式 | `wav` |

---

## 前端组件

### AuthGate.vue

登录页面组件。

- 在 `ACCESS_PASSWORD` 已配置时显示密码输入表单
- 调用 `useAuth().login()` 提交密码
- 暗色独立主题，动态波形装饰动画
- 验证成功后通过 `@authenticated` 事件通知父组件

### VoiceSelector.vue

音色选择组件。

- 展示 8 种音色卡片（中文 4 种 + 英文 4 种）
- 每种音色显示 emoji、名称、语言、性别标识
- `v-model` 双向绑定当前选中音色

### StyleControl.vue

风格控制组件。

- 支持 `natural`（自然语言）和 `tag`（标签）两种模式切换
- 自然语言模式：自由文本输入框
- 标签模式：预设标签按钮组（开心/悲伤/愤怒/温柔等）
- `v-model:mode`、`v-model:stylePrompt`、`v-model:styleTag` 双向绑定

### TextInput.vue

文本输入组件。

- 多行文本输入区
- 实时字数统计
- 支持键盘快捷键

### AudioPlayer.vue

自定义音频播放器。

- 基于 Web Audio API 自研，零外部依赖
- 播放/暂停控制
- 进度拖拽
- 当前时间 / 总时长显示
- WAV 文件下载按钮

---

## 部署指南

### 生产构建

```bash
# 构建前端 + 编译后端 TypeScript
npm run build
cd server && npm run build

# 启动生产服务
NODE_ENV=production node server/dist/index.js
```

生产模式下，服务端自动托管 `client/dist/` 中的静态文件，所有路由回退到 `index.html`（SPA 支持）。

### 使用 PM2（推荐）

```bash
npm install -g pm2

# 先构建
npm run build && cd server && npm run build && cd ..

# 启动（使用编译后的 JS）
NODE_ENV=production pm2 start server/dist/index.js \
  --name mimo-tts

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

### 使用 Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
RUN npm run install:all

COPY . .

RUN npm run build && cd server && npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/dist/index.js"]
```

### 环境变量

参见 `.env.example` 和 README 中的[环境变量章节](#环境变量)。

### 反向代理（Nginx）

```nginx
server {
    listen 80;
    server_name tts.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 开发指南

### 依赖安装

```bash
npm run install:all
```

同时安装根目录、client、server 三处依赖。

### 开发环境

前后端并发启动（推荐）：

```bash
npm run dev
```

- 前端开发服务器：`http://localhost:10086`（Vite HMR）
- 后端 API 服务器：`http://localhost:3000`（tsx watch 热重载）
- Vite 自动将 `/api` 请求代理到后端

单独启动：

```bash
npm run dev:client    # 仅前端
npm run dev:server    # 仅后端
```

### 生产构建编译

```bash
# 前端
cd client && npm run build

# 后端（TypeScript 编译）
cd server && npm run build
```

### 错误排查

| 问题 | 可能原因 | 解决 |
|------|----------|------|
| 登录页空白/报错 | 后端未启动 | 确认 `npm run dev:server` 正常运行 |
| 语音生成失败 | API Key 未配置 | 检查 `.env` 中 `MIMO_API_KEY` |
| 401 循环 | Cookie 过期 | 清除浏览器 Cookie，重新登录 |
| CORS 错误 | 生产部署未用反向代理 | 配置 Nginx 反向代理或统一端口 |
| 重复请求结果相同 | 服务端 LRU 缓存命中 | 正常行为，缓存最多 50 条，重启进程清空 |
