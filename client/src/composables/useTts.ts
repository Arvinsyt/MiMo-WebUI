import { ref } from 'vue'
import type { TtsRequest } from '@/types'
import { useNotification } from './useNotification'

/**
 * TTS 语音合成组合式函数
 * 处理语音生成请求并管理加载状态和音频数据
 */
export function useTts() {
  /** 是否正在生成语音 */
  const isLoading = ref(false)
  /** 生成的音频数据（WAV 格式 ArrayBuffer） */
  const audioBuffer = ref<ArrayBuffer | null>(null)

  const { showError, showSuccess } = useNotification()

  /**
   * 发送 TTS 合成请求
   * @param request - 合成参数（文本、音色、风格等）
   */
  async function generateTts(request: TtsRequest): Promise<void> {
    isLoading.value = true
    audioBuffer.value = null
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      // 会话过期处理
      if (response.status === 401) {
        throw new Error('认证已过期，请重新验证')
      }
      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error || `请求失败: ${response.status}`)
      }
      audioBuffer.value = await response.arrayBuffer()
      showSuccess('语音生成成功')
    } catch (err: any) {
      showError(err.message || '未知错误')
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, audioBuffer, generateTts }
}
