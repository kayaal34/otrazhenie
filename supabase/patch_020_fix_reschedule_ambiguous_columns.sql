-- =========================================================================
-- Патч 020: та же ошибка "column reference is ambiguous", что и в патче
-- 019, но в client_reschedule_booking() — там сразу пять OUT-колонок
-- (booking_id, booking_code, slot_date, start_time, end_time) конфликтуют
-- с одноимёнными колонками таблиц bookings/slots/booking_slots везде,
-- где они использовались без алиаса таблицы. Квалифицируем все такие
-- обращения алиасами.
--
-- Безопасно выполнять повторно.
-- =========================================================================

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
  select b.id, b.duration_hours into v_booking_id, v_duration
  from bookings b
  where upper(trim(b.booking_code)) = upper(trim(p_code))
    and lower(trim(b.client_email)) = lower(trim(p_email))
    and b.deleted_at is null
    and b.status = 'confirmed'
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

  perform 1 from slots s2 where s2.id = any(p_new_slot_ids) for update;

  if exists (
    select 1 from slots s3
    where s3.id = any(p_new_slot_ids)
      and (
        s3.status <> 'available'
        or (s3.slot_date + s3.start_time) at time zone 'Asia/Yekaterinburg' <= now()
      )
  ) then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  update slots
  set status = 'available', locked_until = null, locked_by_token = null
  where id in (select bs2.slot_id from booking_slots bs2 where bs2.booking_id = v_booking_id);

  delete from booking_slots bs3 where bs3.booking_id = v_booking_id;

  insert into booking_slots (booking_id, slot_id)
  select v_booking_id, unnest(p_new_slot_ids);

  update slots
  set status = 'booked', locked_until = null, locked_by_token = null
  where id = any(p_new_slot_ids);

  select min(s4.slot_date), min(s4.start_time), max(s4.end_time)
  into v_slot_date, v_start_time, v_end_time
  from slots s4
  where s4.id = any(p_new_slot_ids);

  return query select v_booking_id, p_code, v_slot_date, v_start_time, v_end_time;
end;
$$;
