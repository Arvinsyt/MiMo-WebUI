import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { config } from '../config.js'
import { addToken, removeToken, isValidToken, getTokenFromRequest } from '../middleware/auth.js'

const router = Router()

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

  const token = randomUUID()
  addToken(token)
  res.cookie('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  })
  res.json({ message: '验证成功' })
})

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

router.get('/auth/check', (req: Request, res: Response) => {
  const token = getTokenFromRequest(req)
  if (!token || !isValidToken(token)) {
    res.status(401).json({ error: '未授权' })
    return
  }
  res.json({ authenticated: true })
})

export default router
