/**
 * TTS 语音合成路由模块
 * 提供 POST 和 GET 两种方式的语音合成接口
 * 包含请求验证、缓存查询、上游 API 调用和速率限制
 */
import { Router, Request, Response } from 'express'
import { config } from '../config.js'
import { audioCache, makeCacheKey } from '../cache.js'
import { checkInputTokens, checkTpmAndReserve, refundTpm, checkOutputSize, UpstreamApiError } from '../middleware/rateLimit.js'

/** TTS 请求参数 */
interface TtsParams {
  text: string
  voiceId: string
  voiceBase64?: string
  styleMode?: 'natural' | 'tag'
  stylePrompt?: string
  styleTag?: string
}

/**
 * 调用 MiMo 上游 API 进行语音合成
 * 根据是否处于音色克隆模式选择不同的模型
 */
async function callMimoTts(params: TtsParams): Promise<{ audioBase64: string }> {
  const { text, voiceId, voiceBase64, styleMode, stylePrompt, styleTag } = params
  const isCloneMode = !!voiceBase64

  // 根据风格模式构建消息列表
  const messages: Array<{ role: string; content: string }> = []

  if (styleMode === 'natural' && stylePrompt) {
    // 自然语言模式：将风格描述作为 user 消息，文本作为 assistant 消息
    messages.push({ role: 'user', content: stylePrompt })
    messages.push({ role: 'assistant', content: text })
  } else if (styleMode === 'tag' && styleTag) {
    // 标签模式：在文本前插入风格标签
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

/** TTS 请求参数（宽松类型，兼容 query string） */
interface TtsRequestOptions {
  text: string
  voiceId?: string
  voiceBase64?: string
  styleMode?: string
  stylePrompt?: string
  styleTag?: string
  raw?: string
}

/**
 * TTS 请求的通用处理函数
 * 包含：参数验证 -> token 检查 -> 速率限制 -> 缓存查询/API 调用 -> 响应
 */
async function handleTtsRequest(res: Response, options: TtsRequestOptions): Promise<void> {
  const { text, voiceId, voiceBase64, styleMode, stylePrompt, styleTag, raw } = options

  // 验证文本不为空
  if (!text || !text.trim()) {
    res.status(400).json({ error: '合成文本不能为空' })
    return
  }

  // 检查 API Key 配置
  if (!config.apiKey) {
    res.status(500).json({ error: 'API Key 未配置，请在 server/.env 中设置 MIMO_API_KEY' })
    return
  }

  // 检查输入 token 是否超过上下文窗口限制
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

  // 检查并预留 TPM（每分钟 token 配额）
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

  // 查询缓存
  const key = makeCacheKey(params)
  let buffer = audioCache.get(key)

  if (!buffer) {
    try {
      // 缓存未命中，调用上游 API
      const result = await callMimoTts(params)

      // 检查输出大小是否超限
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
      // 上游 API 错误时退还预留的 TPM
      if (err instanceof UpstreamApiError) {
        refundTpm(reservedTokens)
      }
      throw err
    }
    // 写入缓存
    audioCache.set(key, buffer)
  }

  // 返回音频数据
  res.set('Content-Type', 'audio/wav')
  if (raw === 'true') {
    res.set('Content-Disposition', 'inline; filename="tts-output.wav"')
  }
  res.send(buffer)
}

const router = Router()

/** POST /api/tts - 从请求体获取参数进行语音合成 */
router.post('/tts', async (req: Request, res: Response) => {
  try {
    await handleTtsRequest(res, req.body)
  } catch (err: any) {
    res.status(500).json({ error: err.message || '服务器内部错误' })
  }
})

/** GET /api/tts - 从查询字符串获取参数进行语音合成 */
router.get('/tts', async (req: Request, res: Response) => {
  try {
    await handleTtsRequest(res, req.query as unknown as TtsRequestOptions)
  } catch (err: any) {
    res.status(500).json({ error: err.message || '服务器内部错误' })
  }
})

export default router
