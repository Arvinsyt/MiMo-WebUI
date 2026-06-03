import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

export class LruCache {
  private maxSize: number
  private cache: Map<string, Buffer>

  constructor(maxSize = 50) {
    this.maxSize = maxSize
    this.cache = new Map()
  }

  get(key: string): Buffer | undefined {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: string, value: Buffer): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

export const audioCache = new LruCache(50)

interface CacheKeyParams {
  text: string
  voiceId: string
  styleMode?: string
  stylePrompt?: string
  styleTag?: string
}

export function makeCacheKey(params: CacheKeyParams): string {
  const raw = `${params.text}|${params.voiceId}|${params.styleMode ?? ''}|${params.stylePrompt ?? ''}|${params.styleTag ?? ''}`
  return createHash('sha256').update(raw).digest('hex')
}
