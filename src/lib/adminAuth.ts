import { supabase } from './supabase'

export async function signInAdmin(email: string, password: string) {
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

export async function requestAdminPasswordReset(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw new Error('Не удалось отправить письмо. Попробуйте ещё раз.')
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return data === true
}
