-- =========================================================================
-- Патч 008: управление администраторами и очистка старых броней.
--
--   1. list_admins() — список админов с email (JOIN на auth.users
--      возможен только через SECURITY DEFINER — напрямую auth.users
--      клиенту недоступна).
--   2. admin_remove_admin() — удаляет запись из admin_users. Нельзя
--      удалить последнего администратора (иначе можно случайно
--      заблокировать себе доступ ко всей панели без возможности вернуться).
--   3. admin_cleanup_old_bookings() — удаляет ТОЛЬКО отменённые брони
--      старше указанной даты. Подтверждённые/ожидающие оплаты брони эта
--      функция не трогает ни при каких условиях — так исключается
--      случайное уничтожение реальной истории заказов. Дополнительно
--      запрещено указывать дату новее, чем 30 дней назад — защита от
--      случайного удаления недавних данных при опечатке в дате.
--
-- Добавление нового админа (приглашение по email через Auth Admin API)
-- обрабатывается отдельной Edge Function admin-invite — Postgres не может
-- напрямую создавать пользователей в auth.users.
--
-- Безопасно выполнять повторно.
-- =========================================================================

create or replace function list_admins()
returns table (user_id uuid, email text, created_at timestamptz)
language plpgsql
security definer
as $$
begin
  if not is_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  return query
    select au.user_id, u.email::text, au.created_at
    from admin_users au
    join auth.users u on u.id = au.user_id
    order by au.created_at asc;
end;
$$;

create or replace function admin_remove_admin(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_total int;
begin
  if not is_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  select count(*) into v_total from admin_users;
  if v_total <= 1 then
    raise exception 'CANNOT_REMOVE_LAST_ADMIN';
  end if;

  delete from admin_users where user_id = p_user_id;

  if not found then
    raise exception 'ADMIN_NOT_FOUND';
  end if;
end;
$$;

create or replace function admin_cleanup_old_bookings(p_older_than date)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  if not is_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  if p_older_than > (current_date - interval '30 days')::date then
    raise exception 'CUTOFF_TOO_RECENT';
  end if;

  delete from bookings
  where status = 'cancelled' and created_at < p_older_than::timestamptz;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
