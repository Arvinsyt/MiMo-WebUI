import os from 'os'
import express from 'express'
import cors from 'cors'
import { resolve } from 'path'
import { config } from './config.js'
import ttsRouter from './routes/tts.js'
import authRouter from './routes/auth.js'
import { authMiddleware } from './middleware/auth.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api', authRouter)
app.use('/api', authMiddleware, ttsRouter)

if (config.isProduction) {
  const clientDist = resolve(import.meta.dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('/{*path}', (_req, res) => {
    res.sendFile(resolve(clientDist, 'index.html'))
  })
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', apiKeyConfigured: !!config.apiKey })
})

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

app.listen(config.port, () => {
  console.log(`服务器已启动:`)
  console.log(`  本地: http://localhost:${config.port}`)
  for (const ip of getLanAddresses()) {
    console.log(`  局域网: http://${ip}:${config.port}`)
  }
  console.log(`API Key 已配置: ${!!config.apiKey}`)
  console.log(`访问密码已配置: ${!!config.accessPassword}`)
})