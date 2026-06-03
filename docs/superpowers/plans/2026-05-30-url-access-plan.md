# URL 接入访问实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 为 MiMo TTS WebUI 添加 GET /api/tts 接口和生产模式全栈部署能力

**架构：** 提取共享合成函数 `callMimoTts` 供 POST/GET 复用；GET 支持 `raw` 参数控制响应格式；Express 生产模式托管前端静态文件

**技术栈：** Express 4, TypeScript 5, Node.js 18+

---

### Task 1: 添加 isProduction 配置项

**Files:**
- Modify: `server/src/config.ts:9-12`

- [ ] **Step 1: 新增 isProduction 属性**

编辑 `server/src/config.ts`，在 `port` 和 `apiKey` 之间添加 `isProduction`：

```typescript
export const config = {
  port: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === 'production',
  apiKey: isPlaceholder ? '' : rawApiKey,
  apiBase: 'https://api.xiaomimimo.com/v1'
}
```

- [ ] **Step 2: 验证编译通过**

```bash
cd server && npx tsc --noEmit
```

预期：无错误输出。

- [ ] **Step 3: 提交**

```bash
git add server/src/config.ts
git commit -m "feat: 添加 isProduction 配置项"
```

---

### Task 2: 提取共享合成逻辑 callMimoTts

**Files:**
- Modify: `server/src/routes/tts.ts`

将 POST handler 中调用 MiMo API 的核心逻辑提取为独立函数。

- [ ] **Step 1: 提取 callMimoTts 函数**

编辑 `server/src/routes/tts.ts`，在 `router` 定义之前添加共享函数：

```typescript
import { Router, Request, Response } from 'express'
import { config } from '../config.js'

const router = Router()

interface TtsParams {
  text: string
  voiceId: string
  styleMode?: 'natural' | 'tag'
  stylePrompt?: string
  styleTag?: string
}

async function callMimoTts(params: TtsParams): Promise<string> {
  const { text, voiceId, styleMode, stylePrompt, styleTag } = params

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
      model: 'mimo-v2.5-tts',
      messages,
      audio: {
        format: 'wav',
        voice: voiceId
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

  return audioBase64
}
```

- [ ] **Step 2: 重构 POST handler 使用共享函数**

将原有的 POST handler body 替换为调用 `callMimoTts`：

```typescript
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceId, styleMode, stylePrompt, styleTag } = req.body as TtsRequestBody

    if (!text || !text.trim()) {
      res.status(400).json({ error: '合成文本不能为空' })
      return
    }

    if (!config.apiKey) {
      res.status(500).json({ error: 'API Key 未配置，请在 server/.env 中设置 MIMO_API_KEY' })
      return
    }

    const audioBase64 = await callMimoTts({ text, voiceId, styleMode, stylePrompt, styleTag })

    res.json({ audioBase64, format: 'wav' })
  } catch (err: any) {
    res.status(500).json({ error: err.message || '服务器内部错误' })
  }
})
```

- [ ] **Step 3: 验证编译通过**

```bash
cd server && npx tsc --noEmit
```

预期：无错误输出。

- [ ] **Step 4: 提交**

```bash
git add server/src/routes/tts.ts
git commit -m "refactor: 提取 callMimoTts 共享合成函数"
```

---

### Task 3: 添加 GET /api/tts 路由

**Files:**
- Modify: `server/src/routes/tts.ts`

在 POST handler 之后添加 GET handler，支持 `raw` 参数控制响应格式。

- [ ] **Step 1: 添加 GET /tts handler**

在 `router.post('/tts', ...)` 之后添加：

```typescript
router.get('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceId, styleMode, stylePrompt, styleTag, raw } = req.query as Record<string, string | undefined>

    if (!text || !text.trim()) {
      res.status(400).json({ error: '合成文本不能为空' })
      return
    }

    if (!config.apiKey) {
      res.status(500).json({ error: 'API Key 未配置，请在 server/.env 中设置 MIMO_API_KEY' })
      return
    }

    const audioBase64 = await callMimoTts({
      text,
      voiceId: voiceId || '冰糖',
      styleMode: styleMode as 'natural' | 'tag' | undefined,
      stylePrompt,
      styleTag
    })

    if (raw === 'true') {
      const audioBuffer = Buffer.from(audioBase64, 'base64')
      res.set('Content-Type', 'audio/wav')
      res.set('Content-Disposition', 'inline; filename="tts-output.wav"')
      res.send(audioBuffer)
    } else {
      res.json({ audioBase64, format: 'wav' })
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || '服务器内部错误' })
  }
})
```

- [ ] **Step 2: 验证编译通过**

```bash
cd server && npx tsc --noEmit
```

预期：无错误输出。

- [ ] **Step 3: 提交**

```bash
git add server/src/routes/tts.ts
git commit -m "feat: 添加 GET /api/tts 路由，支持 raw 参数"
```

---

### Task 4: 添加生产模式静态文件服务

**Files:**
- Modify: `server/src/index.ts`

Express 在生产模式下托管 `client/dist` 目录并提供 SPA fallback。

- [ ] **Step 1: 添加静态文件服务中间件**

编辑 `server/src/index.ts`，在 `app.use('/api', ttsRouter)` 之后、`app.get('/health', ...)` 之前添加：

```typescript
import { resolve } from 'path'

// ... 现有代码 ...

app.use('/api', ttsRouter)

if (config.isProduction) {
  const clientDist = resolve(import.meta.dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(resolve(clientDist, 'index.html'))
  })
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', apiKeyConfigured: !!config.apiKey })
})
```

注意：`import { resolve } from 'path'` 若已存在则无需重复导入。

- [ ] **Step 2: 验证编译通过**

```bash
cd server && npx tsc --noEmit
```

预期：无错误输出。

- [ ] **Step 3: 提交**

```bash
git add server/src/index.ts
git commit -m "feat: 生产模式 Express 托管前端静态文件"
```

---

### Task 5: 端到端验证

**Files:** 无代码改动

用 `curl` 验证 GET 接口和静态文件服务是否正常工作。

- [ ] **Step 1: 构建前端 + 编译后端**

```bash
npm run build && cd server && npm run build
```

- [ ] **Step 2: 启动生产服务**

```bash
cd server && NODE_ENV=production node dist/index.js
```

预期输出：
```
服务器已启动: http://localhost:3000
API Key 已配置: true
```

- [ ] **Step 3: 测试 GET /api/tts 返回 JSON**

```bash
curl -s "http://localhost:3000/api/tts?text=你好&voiceId=冰糖" | head -c 100
```

预期：输出以 `{"audioBase64":"` 开头的 JSON。

- [ ] **Step 4: 测试 GET /api/tts 返回原始 WAV**

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}" "http://localhost:3000/api/tts?text=你好&voiceId=冰糖&raw=true"
```

预期：输出 `200 audio/wav`。

- [ ] **Step 5: 测试静态文件服务**

```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/"
```

预期：输出 `200`（返回 index.html）。

- [ ] **Step 6: 测试 SPA fallback**

```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/some/unknown/path"
```

预期：输出 `200`（回退到 index.html）。

- [ ] **Step 7: 停止测试服务**

```bash
# 按 Ctrl+C 或在另一个终端执行：kill $(lsof -ti:3000)
```

- [ ] **Step 8: 提交完整实现**

```bash
git add .
git commit -m "feat: 添加 URL 接入访问和生产部署支持"
```
