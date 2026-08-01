-- =========================================================================
-- Патч 009: устраняет ложное срабатывание защиты "CUTOFF_TOO_RECENT" в
-- admin_cleanup_old_bookings().
--
-- Причина: клиент вычисляет "30 дней назад" по локальной дате в браузере
-- (часовой пояс Камышлова — UTC+5), а сервер сравнивал с current_date в
-- UTC. Часть суток локальная дата на 1 день "впереди" серверной UTC-даты,
-- из-за чего дата по умолчанию (ровно 30 дней назад) иногда отклонялась
-- как "слишком свежая", хотя пользователь ничего не менял.
--
-- Фикс: серверный порог смещён до 29 дней — этого достаточно, чтобы
-- покрыть любой часовой пояс с разницей до суток, а защита от опечаток
-- в дате (основная цель проверки) сохраняется полностью.
--
-- Безопасно выполнять повторно.
-- =========================================================================

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

  if p_older_than > (current_date - interval '29 days')::date then
    raise exception 'CUTOFF_TOO_RECENT';
  end if;

  delete from bookings
  where status = 'cancelled' and created_at < p_older_than::timestamptz;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
