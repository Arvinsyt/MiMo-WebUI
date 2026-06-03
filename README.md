<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/MiMo_TTS_WebUI-v2.5-amber?style=for-the-badge&labelColor=1a1a2e&color=d4a373">
    <img alt="MiMo TTS WebUI" src="https://img.shields.io/badge/MiMo_TTS_WebUI-v2.5-amber?style=for-the-badge&labelColor=fefae0&color=d4a373">
  </picture>
</p>

<p align="center">
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue_3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-ccb9b1?style=flat-square">
</p>

<p align="center">
  为 <b>MiMo V2.5 TTS</b> 模型打造的现代化 Web 界面。<br>
  将文本转化为自然流畅的语音，支持多种 AI 音色与 expressive 风格控制。
</p>

<br>

---

## 📋 目录

- [📘 详细文档](docs/Guide.md)
- [✨ 特性一览](#-特性一览)
- [🚀 快速开始](#-快速开始)
- [🎤 音色与风格](#-音色与风格)
- [🏗️ 系统架构](#️-系统架构)
- [🛠️ 技术栈](#️-技术栈)
- [📡 API 参考](#-api-参考)
- [💻 本地开发](#-本地开发)
- [📄 环境变量](#-环境变量)

---

## 📘 详细文档

更多技术细节请参阅 [`docs/Guide.md`](docs/Guide.md)，包含：

- 认证流程时序图与设计要点
- 每个 API 端点的完整请求/响应示例与错误码
- 前端组件职责说明
- PM2、Docker、Nginx 部署配置
- 开发环境搭建与常见问题排查

---

## ✨ 特性一览

| | |
|---|---|
| 🎭 **8 种 AI 音色** | 4 种中文（冰糖、茉莉、苏打、白桦）+ 4 种英文（Mia、Chloe、Milo、Dean），性别 & 语言一目了然 |
| 🎛️ **双模式风格控制** | **自然语言模式**——用文字描述语气（如"用温暖的微笑轻声说话"）；**标签模式**——从预设词条（开心、悲伤、愤怒、温柔…）中快速选择 |
| 🎵 **浏览器内音频播放器** | 基于 Web Audio API 自研播放器，支持播放/暂停、进度拖拽、时间显示 |
| ⬇️ **WAV 下载** | 一键下载生成的 `.wav` 音频文件 |
| 🔐 **密码访问门** | 可选的身份验证，通过 `.env` 配置 `ACCESS_PASSWORD` 启用 |
| 🍪 **Cookie 令牌鉴权** | 服务端签发 `httpOnly` Cookie，安全无感 |
| ⚡ **音频 LRU 缓存** | 服务端 LRU 缓存机制，重复请求直接返回缓存音频 |
| 📡 **原始音频端点** | `GET /api/tts?raw=true` 直出 WAV 字节流，方便脚本或第三方工具集成 |
| 🌙 **暗色登录界面** | 登录页独立暗黑主题，动态波形动画营造进入主应用前的仪式感 |
| 🔥 **零 UI 依赖** | 无 Tailwind、无组件库、无图标库——所有 CSS 和图标均为手工定制 |

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18
- **MiMo TTS API 密钥**（`MIMO_API_KEY`）

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/mimo-tts-webui.git
cd mimo-tts-webui

# 2. 安装所有依赖（根目录 + client + server）
npm run install:all

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 API Key

# 4. 启动开发环境（前后端并发启动）
npm run dev
```

浏览器打开 `http://localhost:10086` 即可使用。

> 如果设置了 `ACCESS_PASSWORD`，首次访问会进入登录页面，输入密码后自动跳转主界面。

---

## 🎤 音色与风格

### 可用音色

| 音色 | 语言 | 性别 |
|------|------|------|
| 冰糖 (Bingtang) | 中文 | 女 |
| 茉莉 (Moli) | 中文 | 女 |
| 苏打 (Soda) | 中文 | 男 |
| 白桦 (Baihua) | 中文 | 男 |
| Mia | 英文 | 女 |
| Chloe | 英文 | 女 |
| Milo | 英文 | 男 |
| Dean | 英文 | 男 |

### 风格控制

**自然语言模式**——自由输入想要的语气和情感描述：

> 用温暖的微笑轻声说话，像是在哄小朋友入睡

**标签模式**——从预设标签中快速选择，也可自行输入：

| 中文标签 | 英文标签 |
|----------|----------|
| 开心、悲伤、愤怒、温柔 | happy, sad, angry, gentle |
| 惊讶、恐惧、厌恶、俏皮 | surprised, fearful, disgusted, playful |
| 冷静、严肃 | calm, serious |

---

## 🏗️ 系统架构

```
mimo-tts-webui/
│
├── client/                        # Vue 3 SPA 前端
│   ├── src/
│   │   ├── App.vue                # 根组件（布局编排）
│   │   ├── main.ts                # Vue 入口
│   │   ├── components/
│   │   │   ├── AuthGate.vue       # 登录页（密码门）
│   │   │   ├── VoiceSelector.vue  # 音色选择器
│   │   │   ├── StyleControl.vue   # 风格模式切换 & 输入
│   │   │   ├── TextInput.vue      # 文本输入区 + 字数统计
│   │   │   └── AudioPlayer.vue    # 自定义音频播放器
│   │   ├── composables/
│   │   │   ├── useAuth.ts         # 认证状态管理
│   │   │   └── useTts.ts          # TTS API 调用封装
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript 接口 & 音色数据
│   │   └── vite-env.d.ts         # Vite 类型声明
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                        # Express API 后端
│   ├── src/
│   │   ├── index.ts               # 服务入口
│   │   ├── config.ts              # 环境变量配置
│   │   ├── routes/
│   │   │   ├── auth.ts            # 登录 / 登出路由
│   │   │   └── tts.ts             # TTS 生成路由
│   │   └── middleware/
│   │       └── auth.ts            # 令牌验证中间件
│   └── package.json
│
├── .env.example                   # 环境变量模板
└── package.json                   # 根工作区脚本
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端框架** | Vue 3 (Composition API + `<script setup>`) |
| **构建工具** | Vite 6 |
| **后端框架** | Express 4 (TypeScript, ESM) |
| **运行时** | tsx（开发）、Node.js（生产） |
| **样式方案** | 自研 CSS 设计系统（CSS 自定义属性），零外部 UI 库 |
| **字体** | Noto Serif SC · Noto Sans SC · DM Sans |
| **类型保障** | 前后端全覆盖 TypeScript |

---

## 📡 API 参考

| 端点 | 方法 | 鉴权 | 描述 |
|------|------|------|------|
| `/api/auth` | POST | 否 | 密码登录，返回令牌 |
| `/api/auth/logout` | POST | 是 | 注销当前会话 |
| `/api/auth/check` | GET | 是 | 验证当前会话是否有效 |
| `/api/tts` | POST | 是 | 提交文本与音色参数，返回 `Content-Type: audio/wav` 原始 WAV 字节流 |
| `/api/tts` | GET | 是 | 查询参数调用，返回 `Content-Type: audio/wav` 原始 WAV 字节流；`?raw=true` 额外添加 `Content-Disposition` 文件头 |
| `/health` | GET | 否 | 健康检查 + API Key 状态 |

---

## 💻 本地开发

```bash
# 仅启动前端（需后端已运行）
npm run dev:client

# 仅启动后端
npm run dev:server

# 生产构建（编译前端 + 后端 TypeScript）
npm run build
cd server && npm run build

# 生产模式启动
NODE_ENV=production node server/dist/index.js
```

> 生产模式下，服务端自动托管 `client/dist/` 中的静态文件，所有路由回退到 `index.html`（SPA 支持）。

---

## 📄 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `MIMO_API_KEY` | ✅ | — | MiMo TTS API 密钥 |
| `ACCESS_PASSWORD` | ❌ | — | 访问密码，设置后需验证才能使用 |
| `PORT` | ❌ | `3000` | 服务端口号 |
| `NODE_ENV` | ❌ | `development` | 运行环境（`development` / `production`） |

<p align="center">
  <sub>使用 ❤︎ 与 Vue 3 构建 · MiMo TTS WebUI</sub>
  <br>
  <sub>最后审查: 2026-06-01 · 发现错误？欢迎提交 Issue / PR</sub>
</p>
