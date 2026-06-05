<h1 align="center">MiMo TTS WebUI</h1>

<p align="center">基于 <strong>MiMo V2.5 TTS API</strong> 的文本转语音网页应用。<br>简洁美观的中文界面，支持多音色选择、语音克隆、风格控制与 WAV 音频生成。</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue_3-4FC08D?logo=vuedotorg&logoColor=white" alt="Vue 3">
  <img src="https://img.shields.io/badge/Express_5-000000?logo=express&logoColor=white" alt="Express 5">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
</p>

<br>

## ✨ 功能一览

| 特性 | 说明 |
|------|------|
| 🎙️ **8 种预设音色** | 4 中文（冰糖·茉莉·苏打·白桦）+ 4 英文（Mia·Chloe·Milo·Dean） |
| 🧬 **语音克隆** | 上传音频样本进行声音模仿 |
| 🎨 **风格控制** | 自然语言描述 / 音频标签两种模式 |
| ▶️ **音频播放器** | 网页内播放、拖动进度、下载 WAV |
| 🔒 **密码保护** | 可选访问密码，httpOnly Cookie 认证 |
| 🛡️ **限流保护** | 请求频率 + Token 用量双重限流 |

<br>

## 🚀 快速开始

```bash
# 1. 克隆并安装依赖
git clone <repo-url>
cd mimo-tts-webui
npm run install:all

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 MIMO_API_KEY

# 3. 启动开发服务
npm run dev
```

浏览器打开 **http://localhost:10086** 即可使用。

<br>

## 📦 技术栈

| 层 | 技术 |
|---|------|
| **前端框架** | Vue 3（Composition API + `<script setup>`） |
| **构建工具** | Vite 8 |
| **前端语言** | TypeScript 6 |
| **音频播放** | Web Audio API |
| **后端框架** | Express 5 |
| **后端语言** | TypeScript 6 |
| **运行环境** | Node.js ≥ 22 |
| **缓存** | 服务端 LRU（50 条） |

<br>

## 📁 项目结构

```
mimo-tts-webui/
├── .github/                     # GitHub 配置
│   ├── dependabot.yml           # 每周依赖更新
│   └── workflows/ci.yml         # CI 流水线
├── client/                      # Vue 3 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioPlayer.vue      # 音频播放器
│   │   │   ├── AuthGate.vue         # 登录页面
│   │   │   ├── StyleControl.vue     # 风格控制
│   │   │   ├── TextInput.vue        # 文本输入
│   │   │   ├── ToastContainer.vue   # 通知弹窗
│   │   │   ├── VoiceCloneUpload.vue # 语音克隆上传
│   │   │   └── VoiceSelector.vue    # 音色选择器
│   │   ├── composables/
│   │   │   ├── useAuth.ts           # 认证状态管理
│   │   │   ├── useNotification.ts   # 通知系统
│   │   │   └── useTts.ts            # TTS 请求封装
│   │   ├── types/
│   │   │   └── index.ts             # 类型定义
│   │   ├── App.vue              # 根组件
│   │   ├── main.ts              # 应用入口
│   │   └── vite-env.d.ts        # Vite 类型声明
│   ├── index.html               # 入口 HTML
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts           # Vite 配置
├── docs/                        # 文档
├── scripts/
│   └── check-env-example.sh     # CI 校验脚本
├── server/                      # Express 后端
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.ts          # Cookie 认证
│   │   │   └── rateLimit.ts     # 双限流
│   │   ├── routes/
│   │   │   ├── auth.ts          # 认证路由
│   │   │   └── tts.ts           # TTS 路由
│   │   ├── cache.ts             # LRU 缓存
│   │   ├── config.ts            # 环境配置
│   │   └── index.ts             # 应用入口
│   ├── package.json
│   └── tsconfig.json
├── .env.example                 # 环境变量模板
├── .gitignore                   # Git 忽略规则
├── package.json                 # 根编排
└── README.md                    # 项目简介
```

<br>

## ⚙️ 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|:----:|:------:|------|
| `MIMO_API_KEY` | ✅ | — | MiMo API 密钥 |
| `ACCESS_PASSWORD` | ❌ | '' | 访问密码（空则不设限） |
| `PORT` | ❌ | 3000 | 服务端口 |
| `RATE_LIMIT_RPM` | ❌ | 100 | 每分钟请求上限 |
| `RATE_LIMIT_TPM` | ❌ | 10000000 | 每分钟 Token 上限 |

<br>

## 🔨 构建与部署

```bash
npm run install:all   # 安装依赖
npm run build         # 构建前后端
npm start             # 生产模式启动（端口 3000）
```

> 详细文档请参阅 [docs/guide.md](docs/guide.md)

