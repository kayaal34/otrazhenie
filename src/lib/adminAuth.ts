import { supabase } from './supabase'

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string

/**
 * Домен продакшена для ссылок в письмах (сброс пароля и т.п.). Берётся из
 * VITE_SITE_URL, если задан, — так ссылка всегда ведёт на боевой сайт, а
 * не на localhost, даже если письмо случайно отправили из dev-окружения.
 * Без VITE_SITE_URL падаем обратно на window.location.origin — удобно
 * для локальной разработки, но на проде переменная должна быть задана.
 */
const configuredSiteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim()
export const SITE_URL = configuredSiteUrl
  ? configuredSiteUrl.replace(/\/+$/, '')
  : window.location.origin

export async function signInAdmin(email: string, password: string) {
  if (email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Вход разрешён только для административного email.')
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Неверный email или пароль.')
    }
    throw new Error('Не удалось войти. Попробуйте ещё раз.')
  }
}

export async function signOutAdmin() {
  await supabase.auth.signOut()
}

/**
 * Письмо для сброса пароля уходит строго на единственный разрешённый
 * административный email (ADMIN_EMAIL), а ссылка в письме — строго на
 * SITE_URL. Параметров здесь намеренно нет, чтобы вызов физически не мог
 * отправить письмо или ссылку куда-то ещё.
 *
 * ВАЖНО: сам redirectTo должен быть в списке Redirect URLs проекта
 * (Supabase Dashboard → Authentication → URL Configuration) — если его
 * там нет, Supabase молча подставит вместо него дефолтный Site URL
 * проекта, что и уводило ссылку на localhost.
 */
export async function requestAdminPasswordReset() {
  const { error } = await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, {
    redirectTo: `${SITE_URL}/admin/set-password`,
  })
  if (error) throw new Error('Не удалось отправить письмо. Попробуйте ещё раз.')
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return data === true
}
