import { ref } from 'vue'
import { useNotification } from './useNotification'

/** 全局认证状态 */
const isAuthenticated = ref(false)

/**
 * 认证管理组合式函数
 * 提供登录、登出和认证状态检查功能
 */
export function useAuth() {
  const { showError } = useNotification()

  /** 检查当前会话是否已认证 */
  function checkAuth() {
    fetch('/api/auth/check')
      .then(res => { isAuthenticated.value = res.ok })
      .catch(() => {
        isAuthenticated.value = false
        showError('无法连接服务器')
      })
  }

  /**
   * 使用密码登录
   * @param password - 访问密码
   * @returns 是否登录成功
   */
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

  /** 登出当前会话 */
  function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
      .catch(() => showError('退出失败'))
    isAuthenticated.value = false
  }

  return { isAuthenticated, checkAuth, login, logout }
}
