# TTS 性能优化方案

## 概述

消除音频传输中的 base64 编解码冗余（~33% 体积膨胀），引入服务端 LRU 缓存减少重复 API 调用。

## 架构变更

```
之前: MiMo(base64 in JSON) → 服务端透传(base64 in JSON) → 前端 atob → ArrayBuffer → AudioContext
之后: MiMo(base64 in JSON) → 服务端解码 → Buffer (LRU缓存) → 前端 ArrayBuffer → AudioContext
```

### 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/cache.ts` | 新增 | LRU 缓存实现 |
| `server/src/routes/tts.ts` | 修改 | 加入缓存 + 返回二进制 |
| `client/src/composables/useTts.ts` | 修改 | ArrayBuffer 消费 |
| `client/src/components/AudioPlayer.vue` | 修改 | 去 base64，原生 ArrayBuffer |
| `client/src/App.vue` | 修改 | 状态类型调整 |
| `client/src/types/index.ts` | 修改 | 移除 TtsResponse |

## 服务端

### LRU 缓存 (`server/src/cache.ts`)

```typescript
class LruCache {
  private capacity: number
  private cache: Map<string, Buffer>

  constructor(capacity = 50)

  get(key: string): Buffer | undefined    // 命中时移到末尾（最近使用）
  set(key: string, value: Buffer): void   // 超出容量删除最久未使用项
  clear(): void
}
```

- Key = `SHA256(text + voiceId + styleMode + stylePrompt + styleTag)`，使用 `crypto.createHash('sha256')`
- 缓存解码后的 `Buffer`（二次命中可直接 `res.send`）
- 容量 50 条，按实际使用调整

### 二进制直传 (`server/src/routes/tts.ts`)

- `callMimoTts()` 返回 base64 后，在路由处理层解码为 `Buffer`
- 缓存查询前置：先查缓存，命中直接 `res.type('audio/wav').send(buffer)`
- POST `/api/tts` 响应改为 `Content-Type: audio/wav`
- GET `/api/tts` 逻辑不变（已返回二进制），共享缓存逻辑

错误处理：`callMimoTts` 仍可能抛异常，走现有 catch 路径返回 500。

## 前端

### `useTts.ts`

```typescript
const audioBuffer = ref<ArrayBuffer | null>(null)

async function generateTts(request: TtsRequest): Promise<void> {
  const response = await fetch('/api/tts', { method: 'POST', ... })
  audioBuffer.value = await response.arrayBuffer()
}
```

- 移除 `TtsResponse` 类型引用
- 移除 JSON 解析逻辑
- 错误状态（401 / 非 2xx）处理逻辑不变

### `AudioPlayer.vue`

- Prop `audioBase64: string | null` → `audioBuffer: ArrayBuffer | null`
- `decodeAudio(base64: string)` → `decodeAudio(buffer: ArrayBuffer)`
  - 删除 `atob` 循环
  - 直接 `audioContext.decodeAudioData(buffer)`
- `downloadWav()` 使用 `ArrayBuffer` 构造 `Blob`
  - 删除 base64→binary 转换
- watch 逻辑：监听 `audioBuffer` 变化，新值到来时解码、更新 `duration`

### `App.vue`

- `audioBase64` 改为 `audioBuffer: ref<ArrayBuffer | null>(null)`
- `AudioPlayer` 组件的 prop 绑定改为 `:audioBuffer="audioBuffer"`
- `handleGenerate` 逻辑不变（`useTts` 内部已经改为 ArrayBuffer）

### `types/index.ts`

- 移除 `TtsResponse` 接口（不再使用）

## 测试验收

1. 生成短文本（如 5 字）确认播放正常
2. 生成长文本（如 500 字）确认大音频无卡顿
3. 重复生成相同参数确认缓存命中（服务端日志可见）
4. 切换不同音色/风格确认缓存 key 正确隔离
5. 下载按钮确认 WAV 文件内容正确
6. 401 场景确认认证过期提示正常
