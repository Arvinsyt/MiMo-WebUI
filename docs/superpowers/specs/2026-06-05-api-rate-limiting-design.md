# API 速率限制设计文档

## 概述

为 MiMo TTS WebUI 的 Express API 添加四层限制：输入上下文窗口、输出大小、每分钟请求数（RPM）、每分钟上游 token 数（TPM）。所有限制值可配置，默认值按需求确定。

## 限制指标

| 指标 | 默认值 | 作用对象 | 说明 |
|------|--------|----------|------|
| 上下文窗口 | 8,192 tokens | 用户请求 | 限制 `POST /api/tts` 的输入文本总 token 数 |
| 最大输出 | 8,192 bytes | 用户响应 | 限制返回的 WAV 音频数据大小 |
| 最大 RPM | 100 | 用户会话 | 限制每个客户端 IP 每分钟请求数 |
| 最大 TPM | 10,000,000 | 上游 API | 限制每分钟发送到 MiMo API 的总 token 数 |

## 架构

### 中间件层级

```
请求 → JSON解析 → rateLimit RPM → authMiddleware → ttsRouter
                                                      │
                                              ┌───────┴───────┐
                                              │ inputCheck    │ ← 校验上下文窗口
                                              │ tpmTracker    │ ← 校验 TPM 配额
                                              │ call MiMo API │
                                              │ outputCheck   │ ← 校验输出大小
                                              └───────────────┘
                                                        │
                                                    响应客户端
```

- **RPM 检查** 在 `authMiddleware` 之前，避免未经认证的请求消耗认证资源
- **输入检查 + TPM + 输出检查** 在 `ttsRouter` 内部，仅在认证通过后执行

### 文件结构

新增一个文件：

```
server/src/middleware/
  ├── auth.ts          (已有)
  └── rateLimit.ts     (新增)
```

在 `server/src/config.ts` 新增配置项，在 `server/src/routes/tts.ts` 中集成调用。

## 详细设计

### 1. 配置项（`config.ts`）

```typescript
export const config = {
  // ... 已有配置
  rateLimit: {
    contextWindow: Number(process.env.RATE_LIMIT_CONTEXT_WINDOW) || 8192,
    maxOutputBytes: Number(process.env.RATE_LIMIT_MAX_OUTPUT) || 8192,
    maxRpm: Number(process.env.RATE_LIMIT_RPM) || 100,
    maxTpm: Number(process.env.RATE_LIMIT_TPM) || 10_000_000,
  }
}
```

所有限制值可通过环境变量覆盖，无需修改代码。

### 2. Token 估算函数

不引入第三方 tokenizer，采用字符近似算法：

```typescript
function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    if (char >= '\u4e00' && char <= '\u9fff') {
      tokens += 2       // 中文字符 ≈ 2 token
    } else if (/\s/.test(char)) {
      tokens += 0.25    // 空白字符忽略
    } else {
      tokens += 0.25    // 英文/数字 ≈ 4 字符 = 1 token
    }
  }
  return Math.ceil(tokens)
}
```

对于 TTS 输入，需要估算的字段包括：
- `stylePrompt`（自然语言模式下的风格描述）
- `text`（要合成的文本）

估算值相加后与 `contextWindow` 比较，超限则拒绝请求。

### 3. RPM 滑动窗口

基于客户端 IP 的固定窗口算法：

```typescript
interface RpmBucket {
  windowStart: number   // 窗口起始时间戳 (ms)
  count: number         // 当前窗口内请求数
}

const rpmMap = new Map<string, RpmBucket>()

function checkRpm(ip: string): boolean {
  const now = Date.now()
  const bucket = rpmMap.get(ip)

  if (!bucket || now - bucket.windowStart >= 60_000) {
    // 新窗口
    rpmMap.set(ip, { windowStart: now, count: 1 })
    return true
  }

  if (bucket.count >= config.rateLimit.maxRpm) {
    return false  // 超限
  }

  bucket.count++
  return true
}
```

**清理策略**：由于 Map 可能无限增长，可定期（如每分钟）扫描并删除超过 2 分钟未活动的 IP 条目。

### 4. TPM 滑动窗口

与 RPM 类似，但 key 是当前分钟的时间戳（秒级归零），对所有用户共享：

```typescript
interface TpmBucket {
  windowStart: number
  tokensUsed: number
}

let tpmBucket: TpmBucket = { windowStart: Date.now(), tokensUsed: 0 }

function checkTpm(estimatedTokens: number): boolean {
  const now = Date.now()
  if (now - tpmBucket.windowStart >= 60_000) {
    tpmBucket = { windowStart: now, tokensUsed: 0 }
  }

  if (tpmBucket.tokensUsed + estimatedTokens > config.rateLimit.maxTpm) {
    return false  // 超限
  }

  tpmBucket.tokensUsed += estimatedTokens
  return true
}
```

**注意**：TPM 检查在调用上游 API **之前**执行，使用估算值。实际消耗可能与估算有偏差，但作为硬边界足够。

### 5. 输出大小检查

在收到 MiMo API 响应后，对 `choices[0].message.audio.data`（base64 字符串）解码为 Buffer：

```typescript
function checkOutputSize(base64Data: string): boolean {
  const buffer = Buffer.from(base64Data, 'base64')
  return buffer.length <= config.rateLimit.maxOutputBytes
}
```

若超限，不返回音频数据，而是返回 413 错误。客户端应缩短输入文本后重试。

### 6. 响应格式

所有速率限制错误使用一致的 JSON 格式：

```typescript
// 429 RPM 超限
{
  "error": "rate_limit_exceeded",
  "message": "请求过于频繁，请稍后重试",
  "retry_after": <seconds_until_next_window>
}

// 413 上下文窗口超限
{
  "error": "context_window_exceeded",
  "message": "输入文本超过 8K token 限制",
  "limit": 8192,
  "actual": 9200
}

// 413 输出大小超限
{
  "error": "output_size_exceeded",
  "message": "生成的音频数据超过大小限制"
}

// 429 TPM 超限
{
  "error": "tpm_limit_exceeded",
  "message": "上游服务配额已满，请稍后重试",
  "retry_after": <seconds_until_next_window>
}
```

### 7. 集成方式

**`server/src/index.ts`**：RPM 中间件在 JSON 解析后、认证中间件之前注册：

```typescript
import { rpmMiddleware } from './middleware/rateLimit.js'
app.use(express.json({ limit: '10mb' }))
app.use('/api', rpmMiddleware)        // 新增：RPM 检查
app.use('/api', authRouter)
app.use('/api', authMiddleware, ttsRouter)
```

**`server/src/routes/tts.ts`**：在调用 MiMo API 前加入输入检查和 TPM 检查，在收到响应后加入输出检查：

```typescript
// 在 handleTtsRequest 函数中：
// 1. 估算输入 token 数，超限则拒绝
// 2. 检查 TPM 配额，超限则拒绝
// 3. 调用 MiMo API
// 4. 检查输出大小，超限则拒绝
// 5. 返回音频数据
```

### 8. 竞态条件处理

滑动窗口操作是单个 Node.js 事件循环 tick 内的同步操作，无需锁。对于高并发场景，JavaScript 的单线程模型天然保证 `count++` 和 `tokensUsed += x` 的原子性。

### 9. 清理策略

`rpmMap` 中可能累积大量已过期 IP 条目。实现一个轻量清理：

- 在每次 RPM 检查时，若当前 bucket 已过期（距创建超过 2 分钟），删除该条目
- 对于活跃 IP，条目自然更新；对于非活跃 IP，会在下次请求时被清理

## 不涉及的范围

- 不实现分布式限流（多实例部署需共享状态，当前单实例场景不需要）
- 不实现动态限流（限流值在启动时确定，不运行时调整）
- 不添加数据库或 Redis 依赖

## 测试要点

1. 输入 token 估算函数的准确性（边界情况：纯中文、纯英文、混合、空字符串）
2. RPM 窗口重置行为（第 100 次请求成功，第 101 次被拒，下一分钟恢复）
3. TPM 累计行为（多次小请求累计达到上限后被拒）
4. 输出大小检查（短文本通过，长文本被拒）
5. RPM Map 清理不会误删活跃条目
