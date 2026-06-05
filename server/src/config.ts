/**
 * 应用配置模块
 * 从环境变量读取配置，提供统一的配置访问接口
 */
import dotenv from 'dotenv'
import { resolve } from 'path'

// 加载 .env 配置文件
dotenv.config({ path: resolve(import.meta.dirname, '../../.env') })

const rawApiKey = process.env.MIMO_API_KEY || ''
// 检查是否为占位符值（未实际配置）
const isPlaceholder = rawApiKey === 'your_api_key_here'

export const config = {
  /** 服务器监听端口 */
  port: Number(process.env.PORT) || 3000,
  /** 是否为生产环境 */
  isProduction: process.env.NODE_ENV === 'production',
  /** MiMo API Key（占位符值视为空） */
  apiKey: isPlaceholder ? '' : rawApiKey,
  /** MiMo API 基础地址 */
  apiBase: 'https://api.xiaomimimo.com/v1',
  /** 访问密码（空表示不启用认证） */
  accessPassword: process.env.ACCESS_PASSWORD || '',
  /** 速率限制配置 */
  rateLimit: {
    /** 上下文窗口 token 上限 */
    contextWindow: Number(process.env.RATE_LIMIT_CONTEXT_WINDOW) || 8192,
    /** 单次输出最大字节数（0 表示不限制） */
    maxOutputBytes: Number(process.env.RATE_LIMIT_MAX_OUTPUT) || 0,
    /** 每分钟最大请求数（RPM） */
    maxRpm: Number(process.env.RATE_LIMIT_RPM) || 100,
    /** 每分钟最大 token 数（TPM） */
    maxTpm: Number(process.env.RATE_LIMIT_TPM) || 10_000_000,
  }
}
