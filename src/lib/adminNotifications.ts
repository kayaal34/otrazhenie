// Метки «последний раз просмотрено» для бейджей-уведомлений в админ-панели
// (вкладки «Брони» и «Сертификаты»). Хранятся в localStorage — уведомления
// нужны только чтобы привлечь внимание админа в текущем браузере, отдельная
// таблица в БД ради этого не нужна.

const STORAGE_PREFIX = 'otrazhenie_admin_last_seen_'

export type NotificationKey = 'bookings' | 'certificates'

export function getLastSeen(key: NotificationKey): string {
  return localStorage.getItem(STORAGE_PREFIX + key) ?? new Date(0).toISOString()
}

export function markSeen(key: NotificationKey): void {
  localStorage.setItem(STORAGE_PREFIX + key, new Date().toISOString())
}
