# API 速率限制实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Express API 添加四层速率限制：输入上下文窗口(8K tokens)、输出大小(8K bytes)、RPM(100)、TPM(10M)。

**Architecture:** 新增 `server/src/middleware/rateLimit.ts` 统一管理所有限制逻辑。RPM 基于 IP 固定窗口在 auth 之前拦截；输入检查和 TPM 在 TTS 路由内、调上游 API 之前执行；输出检查在收到上游响应后执行。

**Tech Stack:** Express 5, TypeScript ESM, 无新增依赖

---

### Task 1: 添加 rateLimit 配置到 config.ts

**Files:**
- Modify: `server/src/config.ts`

- [ ] **添加 rateLimit 配置字段**

```typescript
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(import.meta.dirname, '../../.env') })

const rawApiKey = process.env.MIMO_API_KEY || ''
const isPlaceholder = rawApiKey === 'your_api_key_here'

export const config = {
  port: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === 'production',
  apiKey: isPlaceholder ? '' : rawApiKey,
  apiBase: 'https://api.xiaomimimo.com/v1',
  accessPassword: process.env.ACCESS_PASSWORD || '',
  rateLimit: {
    contextWindow: Number(process.env.RATE_LIMIT_CONTEXT_WINDOW) || 8192,
    maxOutputBytes: Number(process.env.RATE_LIMIT_MAX_OUTPUT) || 8192,
    maxRpm: Number(process.env.RATE_LIMIT_RPM) || 100,
    maxTpm: Number(process.env.RATE_LIMIT_TPM) || 10_000_000,
  }
}
```

- [ ] **Commit**

```bash
git add server/src/config.ts
git commit -m "feat: add rateLimit config with env overrides"
```

---

### Task 2: 创建 rateLimit 中间件模块

**Files:**
- Create: `server/src/middleware/rateLimit.ts`

- [ ] **创建 rateLimit.ts 文件**

```typescript
import { Request, Response, NextFunction } from 'express'
import { config } from '../config.js'

interface RpmBucket {
  windowStart: number
  count: number
}

const rpmMap = new Map<string, RpmBucket>()
let tpmWindowStart = Date.now()
let tpmTokensUsed = 0

function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    if (char >= '\u4e00' && char <= '\u9fff') {
      tokens += 2
    } else if (/\s/.test(char)) {
      tokens += 0.25
    } else {
      tokens += 0.25
    }
  }
  return Math.ceil(tokens)
}

export function rpmMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const bucket = rpmMap.get(ip)

  if (!bucket || now - bucket.windowStart >= 60_000) {
    rpmMap.set(ip, { windowStart: now, count: 1 })
    next()
    return
  }

  if (bucket.count >= config.rateLimit.maxRpm) {
    const retryAfter = Math.ceil((bucket.windowStart + 60_000 - now) / 1000)
    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: '请求过于频繁，请稍后重试',
      retry_after: retryAfter,
    })
    return
  }

  bucket.count++

  if (bucket.count % 10 === 0) {
    for (const [key, val] of rpmMap) {
      if (now - val.windowStart >= 120_000) {
        rpmMap.delete(key)
      }
    }
  }

  next()
}

export function checkInputTokens(stylePrompt: string | undefined, styleTag: string | undefined, text: string): {
  ok: boolean
  actual: number
  limit: number
} {
  let total = estimateTokens(text)
  if (stylePrompt) total += estimateTokens(stylePrompt)
  if (styleTag) total += estimateTokens(styleTag)
  return { ok: total <= config.rateLimit.contextWindow, actual: total, limit: config.rateLimit.contextWindow }
}

export function checkTpmAndReserve(styleMode: string | undefined, stylePrompt: string | undefined, styleTag: string | undefined, text: string): {
  ok: boolean
  retryAfter?: number
} {
  let upstreamTokens = estimateTokens(text)
  if (styleMode === 'natural' && stylePrompt) {
    upstreamTokens += estimateTokens(stylePrompt)
  } else if (styleMode === 'tag' && styleTag) {
    upstreamTokens = estimateTokens(`(${styleTag})${text}`)
  }

  const now = Date.now()
  if (now - tpmWindowStart >= 60_000) {
    tpmWindowStart = now
    tpmTokensUsed = 0
  }

  if (tpmTokensUsed + upstreamTokens > config.rateLimit.maxTpm) {
    const retryAfter = Math.ceil((tpmWindowStart + 60_000 - now) / 1000)
    return { ok: false, retryAfter }
  }

  tpmTokensUsed += upstreamTokens
  return { ok: true }
}

export function checkOutputSize(base64Data: string): boolean {
  const buffer = Buffer.from(base64Data, 'base64')
  return buffer.length <= config.rateLimit.maxOutputBytes
}
```

- [ ] **Commit**

```bash
git add server/src/middleware/rateLimit.ts
git commit -m "feat: add rateLimit middleware with RPM/TPM/input/output checks"
```

---

### Task 3: 注册 RPM 中间件到 index.ts

**Files:**
- Modify: `server/src/index.ts`

- [ ] **添加 rpmMiddleware 导入和注册**

```typescript
import os from 'os'
import express from 'express'
import cors from 'cors'
import { resolve } from 'path'
import { config } from './config.js'
import ttsRouter from './routes/tts.js'
import authRouter from './routes/auth.js'
import { authMiddleware } from './middleware/auth.js'
import { rpmMiddleware } from './middleware/rateLimit.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api', rpmMiddleware)
app.use('/api', authRouter)
app.use('/api', authMiddleware, ttsRouter)

if (config.isProduction) {
  const clientDist = resolve(import.meta.dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('/{*path}', (_req, res) => {
    res.sendFile(resolve(clientDist, 'index.html'))
  })
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', apiKeyConfigured: !!config.apiKey })
})

function getLanAddresses(): string[] {
  const nets = os.networkInterfaces()
  const result: string[] = []
  for (const [, addrs] of Object.entries(nets)) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        result.push(addr.address)
      }
    }
  }
  return result
}

app.listen(config.port, () => {
  console.log(`服务器已启动:`)
  console.log(`  本地: http://localhost:${config.port}`)
  for (const ip of getLanAddresses()) {
    console.log(`  局域网: http://${ip}:${config.port}`)
  }
  console.log(`API Key 已配置: ${!!config.apiKey}`)
  console.log(`访问密码已配置: ${!!config.accessPassword}`)
})
```

- [ ] **Commit**

```bash
git add server/src/index.ts
git commit -m "feat: register rpmMiddleware in server entry"
```

---

### Task 4: 在 tts.ts 中集成输入/TPM/输出检查

**Files:**
- Modify: `server/src/routes/tts.ts`

- [ ] **在 handleTtsRequest 中添加输入检查和 TPM 检查，在 callMimoTts 中添加输出检查**

```typescript
import { Router, Request, Response } from 'express'
import { config } from '../config.js'
import { audioCache, makeCacheKey } from '../cache.js'
import { checkInputTokens, checkTpmAndReserve, checkOutputSize } from '../middleware/rateLimit.js'

interface TtsParams {
  text: string
  voiceId: string
  voiceBase64?: string
  styleMode?: 'natural' | 'tag'
  stylePrompt?: string
  styleTag?: string
}

async function callMimoTts(params: TtsParams): Promise<Buffer> {
  const { text, voiceId, voiceBase64, styleMode, stylePrompt, styleTag } = params
  const isCloneMode = !!voiceBase64

  const messages: Array<{ role: string; content: string }> = []

  if (styleMode === 'natural' && stylePrompt) {
    messages.push({ role: 'user', content: stylePrompt })
    messages.push({ role: 'assistant', content: text })
  } else if (styleMode === 'tag' && styleTag) {
    messages.push({ role: 'assistant', content: `(${styleTag})${text}` })
  } else {
    messages.push({ role: 'assistant', content: text })
  }

  const response = await fetch(`${config.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey
    },
    body: JSON.stringify({
      model: isCloneMode ? 'mimo-v2.5-tts-voiceclone' : 'mimo-v2.5-tts',
      messages,
      audio: {
        format: 'wav',
        voice: isCloneMode ? voiceBase64 : voiceId
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`MiMo API 错误: ${errorText}`)
  }

  const data = await response.json() as any
  const audioBase64 = data.choices?.[0]?.message?.audio?.data

  if (!audioBase64) {
    throw new Error('未收到音频数据')
  }

  if (!checkOutputSize(audioBase64)) {
    throw new Error('生成的音频数据超过大小限制，请缩短输入文本')
  }

  return Buffer.from(audioBase64, 'base64')
}

interface TtsRequestOptions {
  text: string
  voiceId?: string
  voiceBase64?: string
  styleMode?: string
  stylePrompt?: string
  styleTag?: string
  raw?: string
}

async function handleTtsRequest(res: Response, options: TtsRequestOptions): Promise<void> {
  const { text, voiceId, voiceBase64, styleMode, stylePrompt, styleTag, raw } = options

  if (!text || !text.trim()) {
    res.status(400).json({ error: '合成文本不能为空' })
    return
  }

  if (!config.apiKey) {
    res.status(500).json({ error: 'API Key 未配置，请在 server/.env 中设置 MIMO_API_KEY' })
    return
  }

  const inputCheck = checkInputTokens(stylePrompt, styleTag, text)
  if (!inputCheck.ok) {
    res.status(413).json({
      error: 'context_window_exceeded',
      message: '输入文本超过 8K token 限制',
      limit: inputCheck.limit,
      actual: inputCheck.actual,
    })
    return
  }

  const tpmCheck = checkTpmAndReserve(styleMode, stylePrompt, styleTag, text)
  if (!tpmCheck.ok) {
    res.status(429).json({
      error: 'tpm_limit_exceeded',
      message: '上游服务配额已满，请稍后重试',
      retry_after: tpmCheck.retryAfter,
    })
    return
  }

  const params: TtsParams = {
    text,
    voiceId: voiceId || '冰糖',
    voiceBase64,
    styleMode: styleMode as 'natural' | 'tag' | undefined,
    stylePrompt,
    styleTag,
  }

  const key = makeCacheKey(params)
  let buffer = audioCache.get(key)

  if (!buffer) {
    buffer = await callMimoTts(params)
    audioCache.set(key, buffer)
  }

  res.set('Content-Type', 'audio/wav')
  if (raw === 'true') {
    res.set('Content-Disposition', 'inline; filename="tts-output.wav"')
  }
  res.send(buffer)
}

const router = Router()

router.post('/tts', async (req: Request, res: Response) => {
  try {
    await handleTtsRequest(res, req.body)
  } catch (err: any) {
    res.status(500).json({ error: err.message || '服务器内部错误' })
  }
})

router.get('/tts', async (req: Request, res: Response) => {
  try {
    await handleTtsRequest(res, req.query as unknown as TtsRequestOptions)
  } catch (err: any) {
    res.status(500).json({ error: err.message || '服务器内部错误' })
  }
})

export default router
```

- [ ] **Commit**

```bash
git add server/src/routes/tts.ts
git commit -m "feat: integrate input/TPM/output checks into TTS route"
```

---

### Task 5: 验证构建

- [ ] **运行类型检查确保编译通过**

```bash
npm run typecheck
```

- [ ] **如果有 lint 也跑一下**

```bash
npm run lint
```

如果出错，修复类型错误后提交修复。
