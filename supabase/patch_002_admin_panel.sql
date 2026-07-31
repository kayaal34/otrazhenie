-- =========================================================================
-- Патч 002: серверная логика для админ-панели (Этап 2).
--
-- Добавляет:
--   1. booking_details — view, объединяющий бронь с фоном и датой/временем
--      слота, чтобы админка не собирала это через несколько запросов.
--      security_invoker = true — обязательно, иначе view будет читаться
--      с правами владельца (обходя RLS таблицы bookings).
--   2. admin_cancel_booking() — отмена брони владелицей вручную: считает
--      сумму возврата по тому же правилу 48 часов, помечает бронь
--      cancelled и освобождает слоты обратно в 'available'.
--
-- Безопасно выполнять повторно.
-- =========================================================================

create or replace view booking_details
with (security_invoker = true)
as
select
  b.id,
  b.booking_code,
  b.client_name,
  b.client_phone,
  b.client_email,
  b.guests_count,
  b.with_pet,
  b.comment,
  b.duration_hours,
  b.total_price_kopecks,
  b.status,
  b.payment_provider,
  b.paid_at,
  b.cancelled_at,
  b.refund_kopecks,
  b.created_at,
  bg.name as background_name,
  min(s.slot_date) as slot_date,
  min(s.start_time) as start_time,
  max(s.end_time) as end_time,
  min((s.slot_date + s.start_time)::timestamptz) as start_at
from bookings b
left join backgrounds bg on bg.id = b.background_id
left join booking_slots bs on bs.booking_id = b.id
left join slots s on s.id = bs.slot_id
group by b.id, bg.name;

create or replace function admin_cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_refund int;
begin
  if not is_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  select compute_refund_kopecks(p_booking_id) into v_refund;

  update bookings
  set status = 'cancelled', cancelled_at = now(), refund_kopecks = v_refund
  where id = p_booking_id and status = 'confirmed';

  if not found then
    raise exception 'BOOKING_NOT_CANCELLABLE';
  end if;

  update slots
  set status = 'available', locked_until = null, locked_by_token = null
  where id in (select slot_id from booking_slots where booking_id = p_booking_id);
end;
$$;
