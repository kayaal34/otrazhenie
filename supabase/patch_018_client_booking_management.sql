-- =========================================================================
-- Патч 018: самостоятельное управление бронью клиентом (без входа в
-- систему) — поиск по коду брони + email, отмена и перенос.
--
--   1. find_booking_for_management() — публичная RPC, отдаёт бронь только
--      если код И email совпадают одновременно (защита от перебора кодов
--      — не сообщаем отдельно "код не найден" и "email не совпадает",
--      только общее "не найдено").
--   2. client_cancel_booking() — клиент отменяет свою ОПЛАЧЕННУЮ бронь
--      сам, в любое время; сумма возврата считается тем же правилом
--      48 часов, что и при отмене администратором (compute_refund_kopecks).
--   3. client_reschedule_booking() — самостоятельный перенос доступен
--      только если до начала текущей брони остаётся 48 часов и более
--      (см. Публичную оферту, п.6) — иначе просим написать студии напрямую.
--      Новые слоты проверяются на доступность и на то, что их время ещё
--      не наступило (та же защита, что и в hold_slots).
--
-- Безопасно выполнять повторно.
-- =========================================================================

create or replace function find_booking_for_management(p_code text, p_email text)
returns table (
  id uuid,
  booking_code text,
  client_name text,
  status text,
  duration_hours int,
  total_price_kopecks int,
  background_name text,
  slot_date date,
  start_time time,
  end_time time,
  start_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
    select bd.id, bd.booking_code, bd.client_name, bd.status, bd.duration_hours,
           bd.total_price_kopecks, bd.background_name, bd.slot_date, bd.start_time,
           bd.end_time, bd.start_at
    from booking_details bd
    where upper(trim(bd.booking_code)) = upper(trim(p_code))
      and lower(trim(bd.client_email)) = lower(trim(p_email))
      and bd.deleted_at is null;
end;
$$;

create or replace function client_cancel_booking(p_code text, p_email text)
returns void
language plpgsql
security definer
as $$
declare
  v_booking_id uuid;
  v_refund int;
begin
  select id into v_booking_id
  from bookings
  where upper(trim(booking_code)) = upper(trim(p_code))
    and lower(trim(client_email)) = lower(trim(p_email))
    and deleted_at is null
    and status = 'confirmed'
  for update;

  if v_booking_id is null then
    raise exception 'BOOKING_NOT_FOUND_OR_NOT_CANCELLABLE';
  end if;

  select compute_refund_kopecks(v_booking_id) into v_refund;

  update bookings
  set status = 'cancelled', cancelled_at = now(), refund_kopecks = v_refund
  where id = v_booking_id;

  update slots
  set status = 'available', locked_until = null, locked_by_token = null
  where id in (select slot_id from booking_slots where booking_id = v_booking_id);
end;
$$;

create or replace function client_reschedule_booking(
  p_code text,
  p_email text,
  p_new_slot_ids uuid[]
)
returns table (
  booking_id uuid,
  booking_code text,
  slot_date date,
  start_time time,
  end_time time
)
language plpgsql
security definer
as $$
declare
  v_booking_id uuid;
  v_duration int;
  v_old_start timestamptz;
  v_slot_date date;
  v_start_time time;
  v_end_time time;
begin
  select id, duration_hours into v_booking_id, v_duration
  from bookings
  where upper(trim(booking_code)) = upper(trim(p_code))
    and lower(trim(client_email)) = lower(trim(p_email))
    and deleted_at is null
    and status = 'confirmed'
  for update;

  if v_booking_id is null then
    raise exception 'BOOKING_NOT_FOUND_OR_NOT_RESCHEDULABLE';
  end if;

  select min((s.slot_date + s.start_time)::timestamptz) into v_old_start
  from booking_slots bs
  join slots s on s.id = bs.slot_id
  where bs.booking_id = v_booking_id;

  if v_old_start is null or extract(epoch from (v_old_start - now())) / 3600 < 48 then
    raise exception 'RESCHEDULE_WINDOW_CLOSED';
  end if;

  if array_length(p_new_slot_ids, 1) is distinct from v_duration then
    raise exception 'INVALID_SLOT_COUNT';
  end if;

  perform 1 from slots where id = any(p_new_slot_ids) for update;

  if exists (
    select 1 from slots
    where id = any(p_new_slot_ids)
      and (
        status <> 'available'
        or (slot_date + start_time) at time zone 'Asia/Yekaterinburg' <= now()
      )
  ) then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  update slots
  set status = 'available', locked_until = null, locked_by_token = null
  where id in (select slot_id from booking_slots where booking_id = v_booking_id);

  delete from booking_slots where booking_id = v_booking_id;

  insert into booking_slots (booking_id, slot_id)
  select v_booking_id, unnest(p_new_slot_ids);

  update slots
  set status = 'booked', locked_until = null, locked_by_token = null
  where id = any(p_new_slot_ids);

  select min(s.slot_date), min(s.start_time), max(s.end_time)
  into v_slot_date, v_start_time, v_end_time
  from slots s
  where s.id = any(p_new_slot_ids);

  return query select v_booking_id, p_code, v_slot_date, v_start_time, v_end_time;
end;
$$;
