/**
 * 认证路由模块
 * 提供登录验证、登出和认证状态检查的 API 端点
 */
import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { config } from '../config.js'
import { addToken, removeToken, isValidToken, getTokenFromRequest } from '../middleware/auth.js'

const router = Router()

/**
 * POST /api/auth - 密码登录验证
 * 验证密码后下发 httpOnly 的 auth_token cookie
 */
router.post('/auth', (req: Request, res: Response) => {
  const { password } = req.body as { password?: string }

  if (!password) {
    res.status(400).json({ error: '密码不能为空' })
    return
  }

  if (!config.accessPassword) {
    res.status(500).json({ error: '服务未配置访问密码，请在 .env 中设置 ACCESS_PASSWORD' })
    return
  }

  if (password !== config.accessPassword) {
    res.status(401).json({ error: '密码错误' })
    return
  }

  // 生成随机 token 并写入 cookie
  const token = randomUUID()
  addToken(token)
  res.cookie('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  })
  res.json({ message: '验证成功' })
})

/**
 * POST /api/auth/logout - 退出登录
 * 移除 token 并清除 cookie
 */
router.post('/auth/logout', (req: Request, res: Response) => {
  const token = getTokenFromRequest(req)

  if (!token || !isValidToken(token)) {
    res.status(401).json({ error: '未授权' })
    return
  }

  removeToken(token)
  res.clearCookie('auth_token', { path: '/' })
  res.json({ message: '已退出登录' })
})

/**
 * GET /api/auth/check - 检查认证状态
 * 验证当前请求中的 token 是否有效
 */
router.get('/auth/check', (req: Request, res: Response) => {
  const token = getTokenFromRequest(req)
  if (!token || !isValidToken(token)) {
    res.status(401).json({ error: '未授权' })
    return
  }
  res.json({ authenticated: true })
})

export default router
