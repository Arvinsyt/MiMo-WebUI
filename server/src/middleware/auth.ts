/**
 * 认证中间件模块
 * 使用内存中的 token 集合管理用户会话
 * 支持通过 httpOnly cookie 传递认证信息
 */
import { Request, Response, NextFunction } from 'express'
import { config } from '../config.js'

/**
 * 从请求中提取 auth_token
 * 支持从 Cookie 头中解析
 */
export function getTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.cookie
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)auth_token=([^;]*)/)
    if (match) return match[1]
  }
  return null
}

/** 有效 token 集合 */
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

/**
 * 认证中间件
 * 如果配置了访问密码，则所有请求必须携带有效 token
 * 如果未配置密码则跳过认证
 */
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
