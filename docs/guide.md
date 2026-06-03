# MiMo TTS WebUI — 详细指南

## 目录

- [项目概述](#项目概述)
- [系统架构](#系统架构)
- [认证流程](#认证流程)
- [API 参考](#api-参考)
- [音频缓存](#音频缓存)
- [前端组件](#前端组件)
- [部署指南](#部署指南)
- [开发指南](#开发指南)
- [故障排除](#故障排除)

---

## 项目概述

MiMo TTS WebUI 为 [MiMo V2.5 TTS](https://api.xiaomimimo.com) 模型提供全功能 Web 界面。前端基于 Vue 3 SPA，后端基于 Express 5 + TypeScript ESM，前后端均覆盖 TypeScript 类型保障。

### 适用场景

- 快速体验 MiMo TTS 音色与风格控制
- 为团队或个人部署内部 TTS 工具
- 作为 API 网关代理 MiMo 服务（支持脚本调用 `GET /api/tts?raw=true`）

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 (Composition API + `<script setup>`) | ^3.5 |
| 构建工具 | Vite | ^8.0 |
| 类型检查 | vue-tsc | ^3.3 |
| 后端框架 | Express | ^5.2 |
| 运行时 | tsx (开发) / Node.js (生产) | — |
| 语言 | TypeScript (ESM) | ^6.0 |
| 字体 | Noto Serif SC · Noto Sans SC · DM Sans | — |

---

## 系统架构

```
mimo-tts-webui/
│
├── client/                          # Vue 3 SPA 前端 (Vite 8)
│   ├── src/
│   │   ├── App.vue                  # 根组件：布局编排 + 认证状态
│   │   ├── main.ts                  # Vue 应用入口
│   │   ├── components/
│   │   │   ├── AuthGate.vue         # 暗色登录页（密码门 + 波形动画）
│   │   │   ├── VoiceSelector.vue    # 8 音色卡片选择器
│   │   │   ├── StyleControl.vue     # 自然语言 / 标签双模式风格控制
│   │   │   ├── TextInput.vue        # 文本输入 + 实时字数统计
│   │   │   ├── AudioPlayer.vue      # Web Audio API 自定义播放器
│   │   │   └── ToastContainer.vue   # 浮动通知系统
│   │   ├── composables/
│   │   │   ├── useAuth.ts           # 认证状态（模块级单例）
│   │   │   ├── useTts.ts            # TTS API 调用 + 加载状态
│   │   │   └── useNotification.ts   # 全局 Toast 通知
│   │   └── types/
│   │       └── index.ts             # VoicePreset, TtsRequest, StyleMode
│   ├── index.html                   # 入口 HTML（Google Fonts 加载）
│   └── vite.config.ts               # 端口 10086，代理 /api → :3000
│
├── server/                          # Express 5 API 后端
│   ├── src/
│   │   ├── index.ts                 # 服务入口 + 路由注册 + 静态文件托管
│   │   ├── config.ts                # 环境变量加载（PORT, API Key...）
│   │   ├── cache.ts                 # LRU 音频缓存（50 条，SHA-256 键）
│   │   ├── routes/
│   │   │   ├── auth.ts              # 登录 / 登出 / 会话检查
│   │   │   └── tts.ts               # TTS 生成 + MiMo API 调用
│   │   └── middleware/
│   │       └── auth.ts              # Cookie 令牌验证中间件
│   └── package.json
│
├── .env.example                     # 环境变量模板
├── scripts/
│   └── check-env-example.sh        # CI 环境变量一致性检查
├── .github/workflows/ci.yml        # GitHub Actions CI
└── package.json                     # 根工作区脚本 (concurrently)
```

### 请求流转

```
浏览器 (localhost:10086)
    │
    ▼
Vite Dev Server (端口 10086)
    │ 代理 /api/* 请求
    ▼
Express Server (端口 3000)
    │ authMiddleware 验证 Cookie
    ▼
路由处理器 (tts.ts / auth.ts)
    │ 缓存命中 → 直接返回
    │ 缓存未命中 ↓
    ▼
MiMo API (api.xiaomimimo.com)
    │ 返回 base64 WAV
    ▼
解码 → 缓存 → 返回 audio/wav 字节流
```

---

## 认证流程

系统采用 **Cookie 令牌鉴权** — 无 JWT、无数据库、无会话表，纯内存 `Set<string>` 管理。

### 时序图

```
┌──────────┐                          ┌──────────┐
│  客户端   │                          │  服务端   │
│ (Vue SPA) │                          │ (Express) │
└────┬─────┘                          └────┬─────┘
     │                                      │
     │ ① GET /api/auth/check               │
     │─────────────────────────────────────>│
     │       401 Unauthorized               │  ← 无 Cookie 或令牌无效
     │<─────────────────────────────────────│
     │                                      │
     │ ② POST /api/auth { password }        │
     │─────────────────────────────────────>│
     │   Set-Cookie: auth_token=<uuid>      │  ← 密码正确，签发令牌
     │<─────────────────────────────────────│
     │                                      │
     │ ③ POST /api/tts { text, voiceId }   │
     │   Cookie: auth_token=<uuid>          │
     │─────────────────────────────────────>│
     │   Content-Type: audio/wav            │  ← 令牌有效，返回音频
     │<─────────────────────────────────────│
     │                                      │
     │ ④ POST /api/auth/logout             │
     │   Cookie: auth_token=<uuid>          │
     │─────────────────────────────────────>│
     │   Clear-Cookie: auth_token           │  ← 令牌从内存中删除
     │<─────────────────────────────────────│
```

### 关键设计

| 方面 | 决策 |
|------|------|
| **令牌存储** | 内存 `Set<string>`，服务重启全部失效 |
| **Cookie 安全** | `httpOnly`（防 XSS）+ `SameSite=Lax` + `Path=/` |
| **无密码模式** | `ACCESS_PASSWORD` 为空时，authMiddleware 直接放行 |
| **前端状态** | `useAuth` composable（模块级单例 `ref`），页面加载时自动调用 `/api/auth/check` |
| **登出** | 从 `Set` 删除令牌 + 清除客户端 Cookie |

---

## API 参考

### 基础信息

- **Base URL:** `http://localhost:3000`（开发）/ 生产部署域名
- **Content-Type:** `application/json`（除 `/api/tts` 返回 `audio/wav`）
- **鉴权:** Cookie 头 `auth_token=<uuid>`（`ACCESS_PASSWORD` 未设置时跳过）

---

### POST /api/auth

密码登录。

```
POST /api/auth
Content-Type: application/json

{ "password": "your_password" }
```

**成功 — 200:**

```json
{ "message": "验证成功" }
```

同时响应头设置：`Set-Cookie: auth_token=<uuid>; HttpOnly; SameSite=Lax; Path=/`

**错误:**

| 状态码 | 响应体 | 说明 |
|:------:|--------|------|
| 400 | `{ "error": "密码不能为空" }` | 请求体缺失或 password 为空字符串 |
| 401 | `{ "error": "密码错误" }` | 密码不匹配 |
| 500 | `{ "error": "服务未配置访问密码，请在 .env 中设置 ACCESS_PASSWORD" }` | 服务端未设置密码 |

---

### POST /api/auth/logout

注销当前会话。

```
POST /api/auth/logout
Cookie: auth_token=<uuid>
```

**成功 — 200:** `{ "message": "已退出登录" }` — 同时清除 Cookie。

**错误 — 401:** `{ "error": "未授权" }` — Cookie 缺失或令牌无效。

---

### GET /api/auth/check

验证当前会话。

```
GET /api/auth/check
Cookie: auth_token=<uuid>
```

**成功 — 200:** `{ "authenticated": true }`

**错误 — 401:** `{ "error": "未授权" }`

---

### POST /api/tts

生成语音（JSON 请求体）。

```
POST /api/tts
Content-Type: application/json
Cookie: auth_token=<uuid>

{
  "text": "你好，今天天气真好",
  "voiceId": "冰糖",
  "styleMode": "natural",
  "stylePrompt": "用温暖的微笑轻声说话",
  "styleTag": ""
}
```

**请求参数:**

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:--:|--------|------|
| `text` | string | ✓ | — | 待合成文本 |
| `voiceId` | string | — | `"冰糖"` | 音色 ID（`冰糖` / `Mia` 等） |
| `styleMode` | string | — | — | `"natural"` 或 `"tag"` |
| `stylePrompt` | string | — | — | 自然语言风格描述（`natural` 模式时生效） |
| `styleTag` | string | — | — | 预设风格标签（`tag` 模式时生效） |

**成功 — 200:** `Content-Type: audio/wav` — 原始 WAV 二进制字节流。

**错误:**

| 状态码 | 响应体 | 说明 |
|:------:|--------|------|
| 400 | `{ "error": "合成文本不能为空" }` | text 为空或全空白 |
| 401 | `{ "error": "未授权，请先验证" }` | Cookie 无效 |
| 500 | `{ "error": "API Key 未配置..." }` | `MIMO_API_KEY` 未设置 |
| 500 | `{ "error": "MiMo API 错误: ..." }` | MiMo 服务返回错误 |
| 500 | `{ "error": "未收到音频数据" }` | MiMo 响应中无音频 |

---

### GET /api/tts

以查询参数方式调用，行为与 POST 一致。

```
GET /api/tts?text=你好&voiceId=冰糖&styleMode=natural&stylePrompt=温柔&raw=true
Cookie: auth_token=<uuid>
```

**查询参数:** 同 POST 请求体的字段映射为查询参数。

**`raw` 参数:** 设为 `true` 时，额外添加响应头 `Content-Disposition: inline; filename="tts-output.wav"`，便于浏览器或脚本直接识别为音频文件。

```
# 命令行示例
curl -b "auth_token=<token>" \
  "http://localhost:3000/api/tts?text=Hello&voiceId=Mia&raw=true" \
  -o output.wav
```

---

### MiMo API 调用细节（内部）

服务端通过 `callMimoTts()` 构造 OpenAI 兼容的 Chat Completions 请求调用 MiMo API。

**目标端点:** `POST https://api.xiaomimimo.com/v1/chat/completions`

**鉴权头:** `api-key: <MIMO_API_KEY>`

**请求体构造规则:**

| 风格模式 | messages 构建逻辑 |
|----------|-------------------|
| `natural` | `[{ role: "user", content: stylePrompt }, { role: "assistant", content: text }]` |
| `tag` | `[{ role: "assistant", content: "({styleTag}){text}" }]` |
| 无模式 | `[{ role: "assistant", content: text }]` |

**固定字段:** `model: "mimo-v2.5-tts"`, `audio: { format: "wav", voice: "<voiceId>" }`

**音频提取:** 从 `data.choices[0].message.audio.data` 中读取 base64 编码的 WAV，解码为 `Buffer`。

---

### GET /health

```
GET /health
```

**成功 — 200:**

```json
{ "status": "ok", "apiKeyConfigured": true }
```

无需鉴权。

---

## 音频缓存

服务端 LRU 缓存避免重复文本消耗 MiMo API 配额。

### 缓存参数

| 配置 | 值 |
|------|----|
| 最大容量 | 50 条 |
| 淘汰策略 | LRU（最近最少使用） |
| 缓存键 | `SHA-256(text \| voiceId \| styleMode \| stylePrompt \| styleTag)` |
| TTL | 无（跟随进程生命周期） |
| 实现 | `server/src/cache.ts` — 基于 `Map<string, Buffer>` 的泛型 LRU 类 |
| 单例 | `export const audioCache = new LruCache(50)` |

### 缓存行为

1. 收到 TTS 请求 → 计算 `makeCacheKey(params)`
2. 若缓存命中 → 直接返回 `Buffer`，跳过 MiMo API 调用
3. 若缓存未命中 → 调用 MiMo API → 成功后存入缓存 → 返回音频
4. 缓存满时自动淘汰最久未使用的条目

> **注意:** 无缓存清除端点。如需清空缓存，重启服务端进程即可。

---

## 前端组件

### 应用结构

```
App.vue
├── ToastContainer.vue           # z-index: 9999 浮动通知层
├── AuthGate.vue                # 未认证时显示
└── div.app                     # 已认证时显示
    ├── header                  # 标题 + 登出按钮
    ├── aside.sidebar
    │   ├── VoiceSelector.vue   # v-model → voiceId
    │   └── StyleControl.vue    # v-model:mode, v-model:stylePrompt, v-model:styleTag
    └── section.content
        └── div.content-card
            ├── TextInput.vue   # v-model → text
            ├── button           # 生成按钮 → handleGenerate()
            └── AudioPlayer.vue # prop: audioBuffer
```

> 无需前端路由。单页应用中认证状态决定渲染 AuthGate 还是主界面。

---

### AuthGate.vue

全屏暗色登录页，仅在 `ACCESS_PASSWORD` 已配置时出现。

| 特性 | 实现 |
|------|------|
| 主题 | 独立暗色主题，不受主应用 CSS 变量影响 |
| 视觉效果 | 动态环境光球（ambient orbs）+ 48 条波形柱动画 |
| 卡片风格 | 玻璃拟态（glassmorphism）卡片 + 涟漪徽标 |
| 交互 | 密码输入 → 回车或点击提交 → 调用 `useAuth().login()` |
| 加载态 | 提交按钮显示旋转 spinner |
| 事件 | 认证成功 emit `authenticated` → App.vue 切换视图 |

---

### VoiceSelector.vue

8 种音色的 2×4 网格选择器。

```
Props: modelValue: string   （当前选中的 voiceId）
Emits: update:modelValue    （选中变更）

┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ 🧊 冰糖 │ │ 🌸 茉莉 │ │ 🥤 苏打 │ │ 🌲 白桦 │
│ 女 · 中 │ │ 女 · 中 │ │ 男 · 中 │ │ 男 · 中 │
└────────┘ └────────┘ └────────┘ └────────┘
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ 👩 Mia │ │ 👩 Chloe│ │ 👦 Milo │ │ 👨 Dean │
│ 女 · 英 │ │ 女 · 英 │ │ 男 · 英 │ │ 男 · 英 │
└────────┘ └────────┘ └────────┘ └────────┘
```

每张卡片显示 emoji、名称、性别（女/男）和语言（中/英）标签。选中态通过 CSS class 高亮。

---

### StyleControl.vue

双模式风格控制。

**自然语言模式:** 自由文本 `<textarea>`，输入任意语气描述，如：

> "用温暖的微笑轻声说话，像是在哄小朋友入睡"

**标签模式:** 文本 `<input>` 支持自定义标签 + 12 个预设标签按钮：

| 开心 | 悲伤 | 愤怒 | 温柔 | 高冷 | 慵懒 |
|------|------|------|------|------|------|
| 磁性 | 清亮 | 稚嫩 | 东北话 | 粤语 | 唱歌 |

```
Props:  mode: StyleMode, stylePrompt: string, styleTag: string
Emits:  update:mode, update:stylePrompt, update:styleTag
```

两种模式互斥切换，切换时自动清空另一模式的输入内容。

---

### TextInput.vue

```
Props: modelValue: string
Emits: update:modelValue

┌──────────────────────────────────┐
│                                  │
│  请输入要合成的文本...            │  ← textarea (min-height: 140px)
│                                  │
│                          0/500   │  ← 右下角实时字数
└──────────────────────────────────┘
```

多行输入框，带实时字符计数覆盖层。

---

### AudioPlayer.vue

基于 Web Audio API 的自研播放器，零外部依赖。

```
Props: audioBuffer: ArrayBuffer | null

┌──────────────────────────────────────────────┐
│  ▶  ─────●─────────────────────  00:12/00:35 │
│                                     ⬇ WAV   │
└──────────────────────────────────────────────┘
```

| 功能 | 实现 |
|------|------|
| 音频解码 | `AudioContext.decodeAudioData()` |
| 播放/暂停 | `AudioBufferSourceNode` + `start()` / `stop()` |
| 进度控制 | 点击进度条跳转 → `start(0, offset)` |
| 时间显示 | 当前时间 / 总时长，`setInterval` 驱动 |
| 下载 | 从 `ArrayBuffer` 构造 Blob URL → `<a download>` |

当 `audioBuffer` prop 变化时自动解码新音频。组件卸载（`onUnmounted`）时清理 AudioContext 资源。

---

### ToastContainer.vue

```
┌─────────────────────────────────┐
│ ⚠  API Key 未配置               │  ← error（红色左边栏）
├─────────────────────────────────┤
│ ✓  音频生成成功                  │  ← success（绿色左边栏）
├─────────────────────────────────┤
│ ℹ  正在生成语音...              │  ← info（蓝色左边栏）
└─────────────────────────────────┘
```

- 基于 `useNotification()` 模块级单例（`ref<Notification[]>`）
- `<TransitionGroup>` 实现交错进出动画
- 点击关闭或 4 秒自动消失
- 三种类型各有独立样式（error / success / info）

---

### Composables

**useAuth.ts** — 认证状态管理

```ts
// 模块级单例 ref —— 全局唯一状态源
const isAuthenticated = ref<boolean>(false)

checkAuth(): Promise<void>        // GET /api/auth/check
login(password: string): Promise<void>  // POST /api/auth
logout(): Promise<void>           // POST /api/auth/logout
```

**useTts.ts** — TTS 调用封装

```ts
const isLoading = ref(false)
const audioBuffer = ref<ArrayBuffer | null>(null)

generateTts(request: TtsRequest): Promise<void>  // POST /api/tts
```

401 错误时自动调用 `useAuth().logout()` 跳回登录页。

**useNotification.ts** — 全局通知

```ts
add(type: NotificationType, message: string): void
showError(msg: string): void
showSuccess(msg: string): void
showInfo(msg: string): void
```

通知 4 秒后自动从队列移除。

---

## 部署指南

### 生产构建

```bash
npm run build                    # 前端 (vue-tsc + vite build)
cd server && npm run build       # 后端 (tsc)
```

生产模式（`NODE_ENV=production`）下，Express 自动托管 `client/dist/` 静态文件并启用 SPA 回退路由。

```bash
NODE_ENV=production node server/dist/index.js
```

---

### PM2（推荐）

```bash
npm install -g pm2

npm run build && cd server && npm run build && cd ..

NODE_ENV=production pm2 start server/dist/index.js --name mimo-tts

pm2 status          # 查看状态
pm2 startup && pm2 save  # 开机自启
```

---

### Docker

```dockerfile
FROM node:22-alpine

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

```bash
docker build -t mimo-tts-webui .
docker run -d -p 3000:3000 --env-file .env mimo-tts-webui
```

---

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name tts.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 开发指南

### 环境要求

- **Node.js** >= 22
- **npm** >= 9

### 首次安装

```bash
git clone https://github.com/your-username/mimo-tts-webui.git
cd mimo-tts-webui
npm run install:all     # 同时安装 root / server / client 三处依赖
cp .env.example .env    # 编辑填入 MIMO_API_KEY
```

### 启动开发环境

```bash
npm run dev              # 前后端并发启动（推荐）
```

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端 (Vite) | `http://localhost:10086` | HMR 热更新 |
| 后端 (Express) | `http://localhost:3000` | tsx watch 热重载 |

Vite 开发服务器自动将 `/api` 请求代理到后端。

### 单独启动

```bash
npm run dev:client       # 仅前端（需要后端先启动）
npm run dev:server       # 仅后端
```

### 类型检查与构建

```bash
cd client && npx vue-tsc -b    # 前端类型检查
cd server && npx tsc --noEmit  # 后端类型检查
npm run build                  # 前端完整构建
cd server && npm run build     # 后端编译到 dist/
```

### CI

GitHub Actions（`.github/workflows/ci.yml`）流程：
1. Node 22, Ubuntu
2. `.env.example` 一致性检查
3. 安装全部依赖
4. 前端 `vue-tsc` 类型检查 + Vite 构建
5. 后端 `tsc` 编译

---

## 故障排除

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 登录页空白/一直加载 | 后端未启动或端口冲突 | 确认 `npm run dev:server` 正常，检查 3000 端口 |
| 语音生成 500 错误 | `MIMO_API_KEY` 未配置 | 检查 `.env` 文件，确保 `MIMO_API_KEY` 有效 |
| 401 Unauthorized 循环 | Cookie 过期或令牌无效 | 清除浏览器 Cookie，重新登录 |
| CORS 错误 | 生产环境未统一端口或反向代理 | 配置 Nginx 代理，或通过同一端口提供前后端 |
| 重复请求返回相同音频 | LRU 缓存命中（正常行为） | 预期行为，重启进程可清空缓存 |
| 端口 10086 被占用 | 其他进程占用 | `lsof -i :10086` 查找并终止，或修改 `vite.config.ts` |
| `module not found` 错误 | 依赖未完整安装 | 重新运行 `npm run install:all` |
