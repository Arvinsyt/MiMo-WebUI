import { Request, Response, NextFunction } from 'express'
import { config } from '../config.js'

interface RpmBucket {
  windowStart: number
  count: number
}

const rpmMap = new Map<string, RpmBucket>()
let rpmTotalRequests = 0
let tpmWindowStart = Date.now()
let tpmTokensUsed = 0

export class UpstreamApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UpstreamApiError'
  }
}

export function estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    if (char >= '\u4e00' && char <= '\u9fff') {
      tokens += 2
    } else if (!/\s/.test(char)) {
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
  rpmTotalRequests++

  if (rpmTotalRequests % 10 === 0) {
    for (const [key, val] of rpmMap) {
      if (now - val.windowStart >= 120_000) {
        rpmMap.delete(key)
      }
    }
  }

  if (rpmMap.size > 10000) {
    for (const [key, val] of rpmMap) {
      if (now - val.windowStart >= 60_000) {
        rpmMap.delete(key)
      }
    }
  }

  next()
}

export function checkInputTokens(
  stylePrompt: string | undefined,
  styleTag: string | undefined,
  text: string
): { ok: boolean; actual: number; limit: number } {
  let total = estimateTokens(text)
  if (stylePrompt) total += estimateTokens(stylePrompt)
  if (styleTag) total += estimateTokens(styleTag)
  return { ok: total <= config.rateLimit.contextWindow, actual: total, limit: config.rateLimit.contextWindow }
}

export function checkTpmAndReserve(
  styleMode: string | undefined,
  stylePrompt: string | undefined,
  styleTag: string | undefined,
  text: string
): { ok: boolean; retryAfter?: number; reservedTokens?: number } {
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
  return { ok: true, reservedTokens: upstreamTokens }
}

export function refundTpm(tokens: number): void {
  tpmTokensUsed = Math.max(0, tpmTokensUsed - tokens)
}

export function checkOutputSize(base64Data: string): boolean {
  const buffer = Buffer.from(base64Data, 'base64')
  return buffer.length <= config.rateLimit.maxOutputBytes
}
