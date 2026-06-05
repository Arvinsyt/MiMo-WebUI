/**
 * MiMo TTS 服务器入口
 * Express 应用，提供 TTS 语音合成 API 和静态文件服务
 */
import os from 'os'
import express from 'express'
import cors from 'cors'
import { resolve } from 'path'
import { config } from './config.js'
import ttsRouter from './routes/tts.js'
import authRouter from './routes/auth.js'
import { authMiddleware } from './middleware/auth.js'
import { rpmMiddleware } from './middleware/rateLimit.js'

const app = express()

// 跨域和请求体解析
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// API 路由：限流 -> 认证 -> TTS
app.use('/api', rpmMiddleware)
app.use('/api', authRouter)
app.use('/api', authMiddleware, ttsRouter)

// 生产环境下提供前端静态文件
if (config.isProduction) {
  const clientDist = resolve(import.meta.dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('/{*path}', (_req, res) => {
    res.sendFile(resolve(clientDist, 'index.html'))
  })
}

// 健康检查端点
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', apiKeyConfigured: !!config.apiKey })
})

/** 获取本机局域网 IP 地址列表 */
function getLanAddresses(): string[] {
  const nets = os.networkInterfaces()
  const result: string[] = []
  for (const [, addrs] of Object.entries(nets)) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        result.push(addr.address)
      }
    }
  }
  return result
}

// 启动服务器
app.listen(config.port, () => {
  console.log(`服务器已启动:`)
  console.log(`  本地: http://localhost:${config.port}`)
  for (const ip of getLanAddresses()) {
    console.log(`  局域网: http://${ip}:${config.port}`)
  }
  console.log(`API Key 已配置: ${!!config.apiKey}`)
  console.log(`访问密码已配置: ${!!config.accessPassword}`)
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'unset'}`)
  console.log(`API限流设置: RPM=${config.rateLimit.maxRpm}, TPM=${config.rateLimit.maxTpm}, 上下文窗口=${config.rateLimit.contextWindow}, 最大输出=${config.rateLimit.maxOutputBytes === 0 ? '不限' : config.rateLimit.maxOutputBytes + ' bytes'}`)
})
