import { ref } from 'vue'

type NotificationType = 'error' | 'success' | 'info'

export interface Notification {
  id: number
  type: NotificationType
  message: string
}

const notifications = ref<Notification[]>([])
let nextId = 0

export function useNotification() {
  function add(type: NotificationType, message: string) {
    const id = ++nextId
    notifications.value = [...notifications.value, { id, type, message }]
    setTimeout(() => remove(id), 4000)
  }

  function remove(id: number) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  function showError(msg: string) { add('error', msg) }
  function showSuccess(msg: string) { add('success', msg) }
  function showInfo(msg: string) { add('info', msg) }

  return { notifications, showError, showSuccess, showInfo, remove }
}
