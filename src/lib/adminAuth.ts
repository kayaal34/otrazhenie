import { supabase } from './supabase'

export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string

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
 * административный email (ADMIN_EMAIL) — параметра с адресом здесь
 * намеренно нет, чтобы этот вызов физически не мог отправить письмо
 * куда-то ещё.
 */
export async function requestAdminPasswordReset(redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, { redirectTo })
  if (error) throw new Error('Не удалось отправить письмо. Попробуйте ещё раз.')
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return data === true
}
