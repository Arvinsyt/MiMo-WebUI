import { Request, Response, NextFunction } from 'express'
import { config } from '../config.js'

export function getTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.cookie
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)auth_token=([^;]*)/)
    if (match) return match[1]
  }
  return null
}

const validTokens = new Set<string>()

export function addToken(token: string) {
  validTokens.add(token)
}

export function removeToken(token: string) {
  validTokens.delete(token)
}

export function isValidToken(token: string): boolean {
  return validTokens.has(token)
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!config.accessPassword) return next()

  const token = getTokenFromRequest(req)
  if (!token) {
    res.status(401).json({ error: '未授权，请先验证' })
    return
  }

  if (!isValidToken(token)) {
    res.status(401).json({ error: '未授权，请先验证' })
    return
  }

  next()
}
