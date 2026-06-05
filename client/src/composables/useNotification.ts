import { ref } from 'vue'

/** 通知类型：错误 / 成功 / 信息 */
type NotificationType = 'error' | 'success' | 'info'

/** 通知项 */
export interface Notification {
  /** 唯一标识 */
  id: number
  /** 通知类型 */
  type: NotificationType
  /** 通知消息 */
  message: string
}

/** 全局通知列表 */
const notifications = ref<Notification[]>([])
/** 自增 ID 计数器 */
let nextId = 0

/**
 * 通知管理组合式函数
 * 提供添加和移除通知的能力，通知会在 4 秒后自动消失
 */
export function useNotification() {
  /**
   * 添加一条通知
   * @param type - 通知类型
   * @param message - 通知内容
   */
  function add(type: NotificationType, message: string) {
    const id = ++nextId
    notifications.value = [...notifications.value, { id, type, message }]
    // 4 秒后自动移除
    setTimeout(() => remove(id), 4000)
  }

  /** 根据 ID 移除通知 */
  function remove(id: number) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  function showError(msg: string) { add('error', msg) }
  function showSuccess(msg: string) { add('success', msg) }
  function showInfo(msg: string) { add('info', msg) }

  return { notifications, showError, showSuccess, showInfo, remove }
}
