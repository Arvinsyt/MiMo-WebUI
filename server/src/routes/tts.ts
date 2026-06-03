import { Router, Request, Response } from 'express'
import { config } from '../config.js'
import { audioCache, makeCacheKey } from '../cache.js'

interface TtsParams {
  text: string
  voiceId: string
  styleMode?: 'natural' | 'tag'
  stylePrompt?: string
  styleTag?: string
}

async function callMimoTts(params: TtsParams): Promise<Buffer> {
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

  return Buffer.from(audioBase64, 'base64')
}

interface TtsRequestOptions {
  text: string
  voiceId?: string
  styleMode?: string
  stylePrompt?: string
  styleTag?: string
  raw?: string
}

async function handleTtsRequest(res: Response, options: TtsRequestOptions): Promise<void> {
  const { text, voiceId, styleMode, stylePrompt, styleTag, raw } = options

  if (!text || !text.trim()) {
    res.status(400).json({ error: '合成文本不能为空' })
    return
  }

  if (!config.apiKey) {
    res.status(500).json({ error: 'API Key 未配置，请在 server/.env 中设置 MIMO_API_KEY' })
    return
  }

  const params: TtsParams = {
    text,
    voiceId: voiceId || '冰糖',
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