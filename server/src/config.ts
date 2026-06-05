import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(import.meta.dirname, '../../.env') })

const rawApiKey = process.env.MIMO_API_KEY || ''
const isPlaceholder = rawApiKey === 'your_api_key_here'

export const config = {
  port: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === 'production',
  apiKey: isPlaceholder ? '' : rawApiKey,
  apiBase: 'https://api.xiaomimimo.com/v1',
  accessPassword: process.env.ACCESS_PASSWORD || '',
  rateLimit: {
    contextWindow: Number(process.env.RATE_LIMIT_CONTEXT_WINDOW) || 8192,
    maxOutputBytes: Number(process.env.RATE_LIMIT_MAX_OUTPUT) || 8192,
    maxRpm: Number(process.env.RATE_LIMIT_RPM) || 100,
    maxTpm: Number(process.env.RATE_LIMIT_TPM) || 10_000_000,
  }
}