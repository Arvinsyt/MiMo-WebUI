/**
 * 速率限制中间件模块
 * 提供 RPM（每分钟请求数）和 TPM（每分钟 token 数）两级限流
 * 以及输入/输出大小检查功能
 */
import { Request, Response, NextFunction } from 'express'
import { config } from '../config.js'

/** 每分钟请求数（RPM）桶 */
interface RpmBucket {
  windowStart: number
  count: number
}

/** 按 IP 的 RPM 计数 */
const rpmMap = new Map<string, RpmBucket>()
let rpmTotalRequests = 0
/** TPM 窗口起始时间和已用 token 数 */
let tpmWindowStart = Date.now()
let tpmTokensUsed = 0

/** 上游 API 错误标记类，用于决定是否退还 TPM */
export class UpstreamApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UpstreamApiError'
  }
}

/**
 * 估算文本的 token 数量
 * 中文按 2 token/字，英文按 0.25 token/字符（不含空格）
 */
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

/**
 * RPM 限流中间件
 * 按 IP 统计每分钟请求数，超过限制返回 429
 */
export function rpmMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const bucket = rpmMap.get(ip)

  // 新窗口或窗口已过期，重置计数
  if (!bucket || now - bucket.windowStart >= 60_000) {
    rpmMap.set(ip, { windowStart: now, count: 1 })
    next()
    return
  }

  // 超过 RPM 限制
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

  // 定期清理过期桶（每 10 次请求清理一次）
  if (rpmTotalRequests % 10 === 0) {
    for (const [key, val] of rpmMap) {
      if (now - val.windowStart >= 120_000) {
        rpmMap.delete(key)
      }
    }
  }

  // 桶数量过大时强制清理
  if (rpmMap.size > 10000) {
    for (const [key, val] of rpmMap) {
      if (now - val.windowStart >= 60_000) {
        rpmMap.delete(key)
      }
    }
  }

  next()
}

/**
 * 检查输入 token 是否超过上下文窗口限制
 * @returns 检查结果、实际 token 数和限制值
 */
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

/**
 * 检查 TPM 配额并预留 token
 * 按每分钟滑动窗口计算，超额时返回建议的重试等待时间
 */
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

/** 退还已预留的 TPM token（上游 API 错误时调用） */
export function refundTpm(tokens: number): void {
  tpmTokensUsed = Math.max(0, tpmTokensUsed - tokens)
}

/** 检查 Base64 音频数据解码后的字节数是否超过输出大小限制 */
export function checkOutputSize(base64Data: string): boolean {
  const limit = config.rateLimit.maxOutputBytes
  if (limit <= 0) return true
  const buffer = Buffer.from(base64Data, 'base64')
  return buffer.length <= limit
}
