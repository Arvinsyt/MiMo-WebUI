import { Router, Request, Response } from 'express'
import { config } from '../config.js'
import { audioCache, makeCacheKey } from '../cache.js'
import { checkInputTokens, checkTpmAndReserve, refundTpm, checkOutputSize, UpstreamApiError } from '../middleware/rateLimit.js'

interface TtsParams {
  text: string
  voiceId: string
  voiceBase64?: string
  styleMode?: 'natural' | 'tag'
  stylePrompt?: string
  styleTag?: string
}

async function callMimoTts(params: TtsParams): Promise<{ audioBase64: string }> {
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
    throw new UpstreamApiError(`MiMo API 错误: ${errorText}`)
  }

  const data = await response.json() as any
  const audioBase64 = data.choices?.[0]?.message?.audio?.data

  if (!audioBase64) {
    throw new Error('未收到音频数据')
  }

  return { audioBase64 }
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
      message: `输入文本超过 ${inputCheck.limit} token 限制`,
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
  const reservedTokens = tpmCheck.reservedTokens!

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
    try {
      const result = await callMimoTts(params)

      if (!checkOutputSize(result.audioBase64)) {
        refundTpm(reservedTokens)
        res.status(413).json({
          error: 'output_size_exceeded',
          message: '生成的音频数据超过大小限制',
        })
        return
      }

      buffer = Buffer.from(result.audioBase64, 'base64')
    } catch (err) {
      if (err instanceof UpstreamApiError) {
        refundTpm(reservedTokens)
      }
      throw err
    }
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