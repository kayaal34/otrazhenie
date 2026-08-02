import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

export function formatRub(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(kopecks / 100)) + ' ₽'
}

export function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)}–${formatTime(end)}`
}

export function formatDateLabel(dateISO: string): string {
  return format(parseISO(dateISO), 'd MMMM, EEEEEE', { locale: ru })
}

export function formatDateFull(dateISO: string): string {
  return format(parseISO(dateISO), 'd MMMM yyyy', { locale: ru })
}

export function formatDateTime(isoTimestamp: string): string {
  return format(parseISO(isoTimestamp), 'd MMMM yyyy, HH:mm', { locale: ru })
}

export function formatDayShort(dateISO: string): { weekday: string; day: string } {
  const date = parseISO(dateISO)
  return {
    weekday: format(date, 'EEEEEE', { locale: ru }),
    day: format(date, 'd'),
  }
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function addDaysISO(dateISO: string, days: number): string {
  const date = parseISO(dateISO)
  date.setDate(date.getDate() + days)
  return format(date, 'yyyy-MM-dd')
}
