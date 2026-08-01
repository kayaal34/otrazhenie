// Supabase Edge Function (Deno). Вызывается из админ-панели, когда
// администратор приглашает нового администратора по email.
//
// Требует service-role доступ (создание пользователя в auth.users через
// Admin API) — это невозможно сделать напрямую из Postgres, поэтому
// вынесено в отдельную функцию.
//
// Секретов настраивать не нужно — SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY
// доступны автоматически. Деплоить БЕЗ --no-verify-jwt: вызывающий должен
// быть авторизованным пользователем (проверяется дважды — на уровне
// шлюза Supabase и внутри функции через членство в admin_users).

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

type InvitePayload = {
  email: string
  redirectTo?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ ok: false, error: 'Unauthorized' }, 401)
  }
  const jwt = authHeader.slice('Bearer '.length)

  const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt)
  if (userErr || !userData.user) {
    return json({ ok: false, error: 'Unauthorized' }, 401)
  }

  const { data: callerAdminRow } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!callerAdminRow) {
    return json({ ok: false, error: 'Только администратор может приглашать других администраторов' }, 403)
  }

  let payload: InvitePayload
  try {
    payload = await req.json()
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, 400)
  }

  if (!payload.email || !payload.email.includes('@')) {
    return json({ ok: false, error: 'Некорректный email' }, 400)
  }

  const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
    payload.email,
    payload.redirectTo ? { redirectTo: payload.redirectTo } : undefined,
  )

  if (inviteErr || !inviteData.user) {
    return json({ ok: false, error: inviteErr?.message ?? 'Не удалось пригласить пользователя' }, 200)
  }

  const { error: insertErr } = await adminClient
    .from('admin_users')
    .insert({ user_id: inviteData.user.id })

  if (insertErr) {
    return json({ ok: false, error: insertErr.message }, 200)
  }

  return json({ ok: true, user_id: inviteData.user.id }, 200)
})
