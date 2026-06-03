import { ref } from 'vue'
import { useNotification } from './useNotification'

const isAuthenticated = ref(false)

export function useAuth() {
  const { showError } = useNotification()

  function checkAuth() {
    fetch('/api/auth/check')
      .then(res => { isAuthenticated.value = res.ok })
      .catch(() => {
        isAuthenticated.value = false
        showError('无法连接服务器')
      })
  }

  async function login(password: string): Promise<boolean> {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    if (!response.ok) {
      const data = await response.json() as { error?: string }
      throw new Error(data.error || '验证失败')
    }
    isAuthenticated.value = true
    return true
  }

  function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
      .catch(() => showError('退出失败'))
    isAuthenticated.value = false
  }

  return { isAuthenticated, checkAuth, login, logout }
}
