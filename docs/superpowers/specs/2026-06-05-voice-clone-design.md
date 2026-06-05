# 音色复刻功能设计

## 概述

为 MiMo-WebUI 添加音色复刻（Voice Clone）功能，支持用户上传一段音频样本，复刻目标音色后进行语音合成。基于 MiMo API 的 `mimo-v2.5-tts-voiceclone` 模型。

## 范围

- 仅添加音色复刻模式（`mimo-v2.5-tts-voiceclone`）
- **不包含**音色设计模式（`mimo-v2.5-tts-voicedesign`）
- 现有的预置音色模式不变

## UI 架构

### 模式切换

`VoiceSelector.vue` 顶部新增 Tab 栏，包含两个选项卡：

- **预置音色**（默认）：显示 8 个音色卡片，与现有行为一致
- **音色复刻**：隐藏卡片区域，改为显示 `VoiceCloneUpload.vue` 组件

### VoiceCloneUpload.vue（新建）

音频上传组件，功能：

- **拖拽/点击上传**：虚线边框拖拽区域，支持点击选择文件
- **预览播放**：上传后使用 HTML5 `<audio>` 元素直接播放源文件
- **文件信息展示**：文件名、文件大小
- **移除按钮**：清除已选文件

校验规则：

- 格式：仅支持 `audio/mpeg`（mp3）和 `audio/wav`
- 大小：Base64 编码后不超过 10MB（约对应 7.5MB 原始文件）
- 校验失败时通过 Toast 提示错误信息

### Props / Emits

| 组件 | Emits | 说明 |
|------|-------|------|
| VoiceSelector | `update:cloneMode(isCloneMode: boolean)` | Tab 切换事件 |
| VoiceCloneUpload | `update:voiceBase64(value: string \| null)` | 文件 Base64 data URI |
| VoiceCloneUpload | `update:hasFile(value: boolean)` | 是否有有效文件 |

### 生成按钮

当处于音色复刻模式但未上传文件时，生成按钮置灰，显示提示"请先上传音频样本"。

### 风格控制

音色复刻模式下**保留**现有的风格控制面板（自然语言 / 标签控制），与预置音色模式共用。

## 数据流

```
1. 用户选择文件
       │
       ▼
2. FileReader 读取，前端校验格式 + 大小
       │
       ▼
3. Base64 data URI (例如 "data:audio/mpeg;base64,...")
   存入 voiceBase64 ref
       │
       ▼
4. 用户点击「生成语音」
       │
       ▼
5. POST /api/tts
   Body: { text, voiceId: undefined, voiceBase64, styleMode, stylePrompt, styleTag }
       │
       ▼
6. 后端检测 voiceBase64 存在 → 音色复刻模式
   - model: "mimo-v2.5-tts-voiceclone"
   - audio.voice: voiceBase64（直接透传 data URI）
   - audio.format: "wav"
       │
       ▼
7. POST https://api.xiaomimimo.com/v1/chat/completions
       │
       ▼
8. 返回 base64 WAV → 解码 Buffer → 返回前端播放
```

## 后端改动

### routes/tts.ts

在 `handleTtsRequest` 中增加模式判断：

```typescript
const isCloneMode = !!voiceBase64

const body = {
  model: isCloneMode ? 'mimo-v2.5-tts-voiceclone' : 'mimo-v2.5-tts',
  messages,  // 与现有逻辑一致
  audio: {
    format: 'wav',
    voice: isCloneMode ? voiceBase64 : voiceId  // 复刻模式直接传 data URI
  }
}
```

messages 组装逻辑保持不变（natural / tag / 无风格）。

### cache.ts

缓存 key 计算增加音频哈希维度：

```
cacheKey = SHA256(text | voiceId | voiceBase64Sha256[:16] | styleMode | stylePrompt | styleTag)
```

其中 `voiceBase64Sha256` 为 `voiceBase64` 的 SHA256 哈希（取前 16 个字符），避免完整 Base64 字符串出现在 key 中。预置音色模式下此项为空字符串。

## 前端改动

### types/index.ts

扩展类型定义：

```typescript
type SynthesisMode = 'preset' | 'clone'

interface TtsRequest {
  text: string
  voiceId?: string          // 预置音色模式使用
  voiceBase64?: string      // 音色复刻模式使用
  styleMode: StyleMode
  stylePrompt: string
  styleTag: string
}
```

### useTts.ts

请求体增加 `voiceBase64` 字段，直接传入 fetch body。

### App.vue

新增状态管理：

- `isCloneMode: Ref<boolean>`
- `voiceBase64: Ref<string | null>`
- 传递给 `generateTts()` 时根据模式选择 `voiceId` 或 `voiceBase64`
- 生成按钮的 `disabled` 条件增加复刻模式下未上传文件的判断

## 错误处理

| 场景 | 层级 | 处理 |
|------|------|------|
| 未选择文件 | 前端 | 生成按钮置灰 |
| 文件格式不支持 | 前端 | 文件校验拒绝，Toast 提示 |
| Base64 编码后超过 10MB | 前端 | 文件校验拒绝，Toast 提示 |
| MiMo API 返回错误 | 后端 | 解析错误响应，返回 `{ error }` |
| API Key 未配置 | 后端 | 返回 400 错误 |

## 不涉及的内容

- 音色设计模式（`mimo-v2.5-tts-voicedesign`）
- 流式 TTS（低延迟流式暂未上线）
- 音频文件的长期存储/管理
- 复刻音色的命名/管理/列表
