# URL 接入访问设计

## 概述

为 MiMo TTS WebUI 添加两个能力：
1. **GET /api/tts** — 通过 URL 参数调用 TTS 合成，支持返回 JSON 或直接返回 WAV 音频流
2. **生产模式全栈部署** — Express 自动托管前端静态文件，单端口即可访问完整应用

## 共享合成逻辑

将现有 `POST /api/tts` handler 中的 MiMo API 调用逻辑提取为独立函数 `callMimoTts`：

```
callMimoTts(params: {
  text: string
  voiceId: string
  styleMode?: 'natural' | 'tag'
  stylePrompt?: string
  styleTag?: string
}): Promise<{ audioBase64: string }>
```

- POST handler → 解析 body → 调用 `callMimoTts` → 返回 JSON
- GET handler → 解析 query → 调用 `callMimoTts` → 根据 `raw` 参数返回 JSON 或 WAV

## GET /api/tts

| Query 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `text` | string | 是 | 合成文本 |
| `voiceId` | string | 是 | 音色 ID |
| `styleMode` | string | 否 | `natural` 或 `tag` |
| `stylePrompt` | string | 否 | 自然语言风格描述 |
| `styleTag` | string | 否 | 预设风格标签 |
| `raw` | string | 否 | `"true"` 时直接返回 WAV 二进制流 |

响应行为：
- `raw=true` → `Content-Type: audio/wav`，body 为解码后的 WAV 二进制数据
- `raw` 省略或非 `true` → JSON `{ audioBase64, format: 'wav' }`
- 错误时均返回 JSON `{ error: string }`，HTTP 状态码同 POST

## 静态文件服务

在 `server/src/index.ts` 中新增生产模式判断：

```
if production:
  - express.static 托管 client/dist
  - 未匹配路由回退到 index.html (SPA fallback)
```

判断方式：`NODE_ENV === 'production'`。

路径解析：`resolve(import.meta.dirname, '../../client/dist')`

## 错误处理

GET 和 POST 共用相同的错误响应格式：
- 400: 合成文本为空
- 500: API Key 未配置、MiMo API 错误、未收到音频数据
- raw 模式下错误仍返回 JSON（非 WAV 二进制），避免浏览器解析失败

## 受影响文件

| 文件 | 改动 |
|---|---|
| `server/src/routes/tts.ts` | 提取 `callMimoTts`，新增 GET handler |
| `server/src/index.ts` | 生产模式静态文件服务 + SPA fallback |
| `server/src/config.ts` | 新增 `isProduction` 属性 |

## 非功能性需求

- 保持向后兼容：POST 行为完全不变
- GET 输入验证与 POST 一致（text 非空、API Key 检查）
- 对 `raw=true` 的 base64→binary 转换使用 `Buffer.from`
