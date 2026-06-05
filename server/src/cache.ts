/**
 * TTS 音频缓存模块
 * 使用 LRU 缓存策略缓存已生成的音频数据，避免重复请求
 */
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

/** LRU（最近最少使用）缓存 */
export class LruCache {
  private maxSize: number
  private cache: Map<string, Buffer>

  /**
   * @param maxSize - 最大缓存条目数
   */
  constructor(maxSize = 50) {
    this.maxSize = maxSize
    this.cache = new Map()
  }

  /** 获取缓存项（同时将其移到最近使用位置） */
  get(key: string): Buffer | undefined {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  /** 设置缓存项（达到上限时淘汰最久未使用的项） */
  set(key: string, value: Buffer): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  /** 清空缓存 */
  clear(): void {
    this.cache.clear()
  }

  /** 当前缓存大小 */
  get size(): number {
    return this.cache.size
  }
}

/** 全局音频缓存实例（最多缓存 50 条） */
export const audioCache = new LruCache(50)

/** 缓存键参数 */
interface CacheKeyParams {
  text: string
  voiceId: string
  voiceBase64?: string
  styleMode?: string
  stylePrompt?: string
  styleTag?: string
}

/**
 * 根据请求参数生成缓存键
 * 对 voiceBase64 取 SHA-256 前 16 位哈希以控制键长度
 */
export function makeCacheKey(params: CacheKeyParams): string {
  const voiceBase64Hash = params.voiceBase64
    ? createHash('sha256').update(params.voiceBase64).digest('hex').slice(0, 16)
    : ''
  const raw = `${params.text}|${params.voiceId}|${voiceBase64Hash}|${params.styleMode ?? ''}|${params.stylePrompt ?? ''}|${params.styleTag ?? ''}`
  return createHash('sha256').update(raw).digest('hex')
}
