<h1 align="center">MiMo TTS WebUI</h1>

<p align="center">
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue_3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-ccb9b1?style=flat-square">
</p>

<br>

为 **MiMo V2.5 TTS** 模型打造的现代 Web 界面 —— 文字转语音，8 种 AI 音色，自然语言风格控制。

> 详细文档请参阅 [**docs/guide.md**](docs/guide.md)

## 快速开始

```bash
git clone https://github.com/your-username/mimo-tts-webui.git && cd mimo-tts-webui
npm run install:all
cp .env.example .env   # 编辑 .env，填入 MIMO_API_KEY
npm run dev            # 浏览器打开 http://localhost:10086
```

设置 `ACCESS_PASSWORD` 启用密码保护；留空则跳过认证。

## 特性

| | |
|---|---|
| **8 种 AI 音色** | 冰糖、茉莉、苏打、白桦 · Mia、Chloe、Milo、Dean |
| **双模式风格控制** | 自然语言模式（"用温暖的微笑轻声说话"）或 标签模式（开心、悲伤、愤怒…） |
| **自定义音频播放器** | Web Audio API 实现，播放/暂停、进度拖拽、时间显示、WAV 下载 |
| **密码访问门** | 可选 `httpOnly` Cookie 令牌鉴权，配置即启用 |
| **LRU 音频缓存** | 50 条容量，SHA-256 键，重复请求零延迟 |
| **零 UI 依赖** | 无 Tailwind、无组件库、无图标库 —— 全部手工定制 CSS 与 SVG |

## 音色

| 音色 | 语言 | 性别 |
|------|------|------|
| 冰糖 · 茉莉 | 中文 | 女 |
| 苏打 · 白桦 | 中文 | 男 |
| Mia · Chloe | 英文 | 女 |
| Milo · Dean | 英文 | 男 |

## API

| 端点 | 方法 | 鉴权 | 说明 |
|------|------|:--:|------|
| `/api/auth` | POST | - | 密码登录 |
| `/api/auth/logout` | POST | ✓ | 注销会话 |
| `/api/auth/check` | GET | ✓ | 验证会话 |
| `/api/tts` | POST | ✓ | 生成语音（JSON 请求体） |
| `/api/tts` | GET | ✓ | 生成语音（查询参数） |
| `/health` | GET | - | 健康检查 |

## 环境变量

| 变量 | 必填 | 默认值 |
|------|:--:|--------|
| `MIMO_API_KEY` | ✓ | — |
| `ACCESS_PASSWORD` | — | 空（跳过认证） |
| `PORT` | — | `3000` |
| `NODE_ENV` | — | `development` |

## 开发

```bash
npm run dev          # 前后端并发启动
npm run dev:client   # 仅前端 (Vite HMR)
npm run dev:server   # 仅后端 (tsx watch)
npm run build        # 生产构建
```

<p align="center">
  <sub>Vue 3 · Express 5 · Vite 8 · TypeScript 6 · MIT License</sub>
</p>
