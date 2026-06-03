# MiMo V2.5 TTS WebUI 设计文档

## 概述

基于 MiMo V2.5 TTS API 的个人语音合成工具，使用 Vue 3 + Vite + TypeScript 前端和 Node.js Express 后端。

## 技术栈

- **前端**：Vue 3 + Vite + TypeScript
- **后端**：Node.js + Express + TypeScript
- **音频处理**：Web Audio API（浏览器原生，WAV 格式）
- **HTTP 客户端**：fetch API

## 架构

### 数据流

```
用户输入 → 前端组装请求 → POST /api/tts → 后端附加 API Key →
POST https://api.xiaomimimo.com/v1/chat/completions →
MiMo 返回 base64 WAV → 后端透传 → 前端解码播放
```

### 支持的模型

仅支持 `mimo-v2.5-tts`（预置音色模式）。

## 项目结构

```
MiMo-WebUI/
├── client/                    # 前端 Vue 3 + Vite + TS
│   ├── src/
│   │   ├── App.vue           # 主界面（单页布局）
│   │   ├── components/
│   │   │   ├── VoiceSelector.vue    # 预置音色选择器
│   │   │   ├── TextInput.vue        # 文本输入区
│   │   │   ├── StyleControl.vue     # 风格控制（自然语言 + 标签）
│   │   │   ├── AudioPlayer.vue      # 音频播放器
│   │   │   └── GenerateButton.vue   # 生成按钮
│   │   ├── composables/
│   │   │   └── useTts.ts           # TTS 调用逻辑
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript 类型定义
│   │   └── main.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/                    # 后端 Express + TS
│   ├── src/
│   │   ├── index.ts          # Express 入口
│   │   ├── routes/
│   │   │   └── tts.ts        # POST /api/tts
│   │   └── config.ts         # 配置（API Key 读取）
│   ├── .env                  # MIMO_API_KEY
│   ├── tsconfig.json
│   └── package.json
└── package.json              # 根 package.json（monorepo scripts）
```

## 界面布局

单页表单式：左侧参数面板 + 右侧输入/输出。

### 左侧参数面板（320px）

1. **API Key 状态**：显示当前 API Key 是否已配置
2. **预置音色选择**：8 个音色的网格布局，点击选中高亮
3. **风格控制模式切换**：自然语言 / 音频标签两种模式
4. **风格指令输入**：
   - 自然语言模式：多行文本框，输入风格描述
   - 标签模式：单行输入框，输入标签（如 `开心`、`叹气`）

### 右侧主区域

1. **合成文本输入**：多行文本框，输入要合成的文字
2. **生成按钮**：点击触发合成
3. **音频播放器**：播放/暂停、进度条、时间显示
4. **下载按钮**：下载 WAV 格式音频

## 预置音色列表

| 显示名称 | Voice ID | 语言 | 性别 | 图标 |
|---------|----------|------|------|------|
| 冰糖 | 冰糖 | 中文 | 女性 | 🧊 |
| 茉莉 | 茉莉 | 中文 | 女性 | 🌸 |
| 苏打 | 苏打 | 中文 | 男性 | 🥤 |
| 白桦 | 白桦 | 中文 | 男性 | 🌲 |
| Mia | Mia | 英文 | 女性 | 👩 |
| Chloe | Chloe | 英文 | 女性 | 👩 |
| Milo | Milo | 英文 | 男性 | 👦 |
| Dean | Dean | 英文 | 男性 | 👨 |

## 风格控制

### 自然语言模式

- 内容放在 `role: user` 的 `content` 字段
- 用户在左侧输入风格描述（如 "用轻快上扬的语调..."）
- 支持导演模式：角色、场景、指导三维度

### 音频标签模式

- 标签放在 `role: assistant` 的 `content` 中，文本开头
- 格式：`(标签)文本内容`
- 支持的标签类型：
  - 基础情绪：开心/悲伤/愤怒/恐惧/惊讶
  - 复合情绪：怅然/欣慰/无奈/愧疚/释然
  - 整体语调：温柔/高冷/活泼/严肃/慵懒
  - 音色定位：磁性/醇厚/清亮/空灵/稚嫩
  - 人设腔调：夹子音/御姐音/正太音/大叔音
  - 方言：东北话/四川话/河南话/粤语
  - 角色扮演：孙悟空/林黛玉

## API 设计

### 后端路由

```
POST /api/tts
Content-Type: application/json

Request:
{
  "text": "合成文本",
  "voiceId": "冰糖",
  "styleMode": "natural" | "tag",
  "stylePrompt": "自然语言风格描述（styleMode=natural 时使用）",
  "styleTag": "开心（styleMode=tag 时使用）"
}

Response:
{
  "audioBase64": "UklGRi...",
  "format": "wav"
}
```

### 后端逻辑

1. 根据 `styleMode` 组装 `messages` 数组：
   - `natural` 模式：`[{ role: "user", content: stylePrompt }, { role: "assistant", content: text }]`
   - `tag` 模式：`[{ role: "assistant", content: "(styleTag)text" }]`
2. 构建请求体：
   ```json
   {
     "model": "mimo-v2.5-tts",
     "messages": [...],
     "audio": { "format": "wav", "voice": "voiceId" }
   }
   ```
3. 附加 API Key（从 `.env` 读取），请求 MiMo API
4. 从响应中提取 `choices[0].message.audio.data`，返回 base64

## 类型定义

```typescript
interface VoicePreset {
  id: string
  voiceId: string
  label: string
  gender: 'female' | 'male'
  language: 'zh' | 'en'
  emoji: string
}

type StyleMode = 'natural' | 'tag'

interface TtsRequest {
  text: string
  voiceId: string
  styleMode: StyleMode
  stylePrompt: string
  styleTag: string
}

interface TtsResponse {
  audioBase64: string
  format: 'wav'
}
```

## 音频播放

- 使用 Web Audio API 解码 base64 WAV → AudioBuffer
- AudioBufferSourceNode 播放
- 内置播放/暂停、进度条、时间显示
- 下载：将 AudioBuffer 编码为 WAV blob → 触发浏览器下载

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| API Key 无效 | 提示重新配置 |
| 网络错误 | 提示检查连接 |
| 合成失败 | 显示具体错误信息 |
| 音频解码失败 | 提示重试 |
| 文本为空 | 禁用生成按钮 |

## 开发约束

- 全程使用简体中文
- API Key 仅存储在后端 `.env`，不暴露给浏览器
- 无历史记录功能
- 仅支持 WAV 格式下载
