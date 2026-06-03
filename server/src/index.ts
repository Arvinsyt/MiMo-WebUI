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
  app.get('*', (_req, res) => {
    res.sendFile(resolve(clientDist, 'index.html'))
  })
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', apiKeyConfigured: !!config.apiKey })
})

app.listen(config.port, () => {
  console.log(`服务器已启动: http://localhost:${config.port}`)
  console.log(`API Key 已配置: ${!!config.apiKey}`)
  console.log(`访问密码已配置: ${!!config.accessPassword}`)
})