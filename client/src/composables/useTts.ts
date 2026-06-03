import { ref } from 'vue'
import type { TtsRequest } from '@/types'
import { useNotification } from './useNotification'

export function useTts() {
  const isLoading = ref(false)
  const audioBuffer = ref<ArrayBuffer | null>(null)

  const { showError, showSuccess } = useNotification()

  async function generateTts(request: TtsRequest): Promise<void> {
    isLoading.value = true
    audioBuffer.value = null
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
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
