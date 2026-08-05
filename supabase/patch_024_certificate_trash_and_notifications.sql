-- =========================================================================
-- Патч 024: корзина для сертификатов + автоматизация писем/Telegram на
-- отмену и перенос брони.
--
--   1. gift_certificates.deleted_at — та же «Корзина», что уже есть у
--      броней (patch_015): поштучное удаление сертификата не стирает
--      запись, а помечает её, admin_empty_certificate_trash() — очистка.
--   2. notify_email_on_confirm() — теперь шлёт письмо клиенту не только
--      при подтверждении оплаты (status → 'confirmed'), но и при отмене
--      брони (status → 'cancelled'), независимо от того, кто её отменил —
--      администратор (admin_cancel_booking) или сам клиент
--      (client_cancel_booking): у обоих один и тот же UPDATE bookings,
--      который ловит этот триггер. Telegram-уведомление на отмену уже
--      работало для обоих случаев и раньше (см. notify_telegram_on_booking,
--      patch_004/005) — она уже не различает вызывающего.
--   3. client_reschedule_booking() — раньше не слала вообще никаких
--      уведомлений (перенос не меняет bookings.status, поэтому обычные
--      триггеры на этот случай не срабатывают). Теперь в конце функции
--      сама явно дёргает send-booking-email (письмо клиенту с новым
--      временем) и telegram-notify (уведомление администратору) —
--      с событием 'rescheduled' и, для контекста, старой датой/временем.
--
-- Требует уже задеплоенных обновлённых версий Edge Functions
-- send-booking-email и telegram-notify (см. соответствующие правки в
-- supabase/functions/*/index.ts) — иначе триггер/RPC будут исправно
-- вызывать функции, но те не будут знать про новые события.
--
-- Безопасно выполнять повторно.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Корзина сертификатов
-- -------------------------------------------------------------------------

alter table gift_certificates
  add column if not exists deleted_at timestamptz;

create index if not exists gift_certificates_deleted_at_idx on gift_certificates (deleted_at);

create or replace function admin_empty_certificate_trash()
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

  delete from gift_certificates where deleted_at is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------
-- 2. Письмо клиенту на подтверждение ИЛИ отмену брони
-- -------------------------------------------------------------------------

create or replace function notify_email_on_confirm()
returns trigger
language plpgsql
security definer
as $$
declare
  v_event text;
begin
  if TG_OP = 'UPDATE' and NEW.status = 'confirmed' and OLD.status is distinct from 'confirmed' then
    v_event := 'confirmed';
  elsif TG_OP = 'UPDATE' and NEW.status = 'cancelled' and OLD.status is distinct from 'cancelled' then
    v_event := 'cancelled';
  else
    return NEW;
  end if;

  perform net.http_post(
    url := 'https://tccsrdgjephbqoblygpw.supabase.co/functions/v1/send-booking-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'yahyaasya34'
    ),
    body := jsonb_build_object('event', v_event, 'booking_id', NEW.id)
  );

  return NEW;
end;
$$;

-- -------------------------------------------------------------------------
-- 3. client_reschedule_booking() — + письмо клиенту и Telegram админу
-- -------------------------------------------------------------------------

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
  v_old_slot_date date;
  v_old_start_time time;
  v_old_end_time time;
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

  select min((s.slot_date + s.start_time)::timestamptz), min(s.slot_date), min(s.start_time), max(s.end_time)
  into v_old_start, v_old_slot_date, v_old_start_time, v_old_end_time
  from booking_slots bs
  join slots s on s.id = bs.slot_id
  where bs.booking_id = v_booking_id;

  if v_old_start is null or extract(epoch from (v_old_start - now())) / 3600 < 24 then
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

  perform net.http_post(
    url := 'https://tccsrdgjephbqoblygpw.supabase.co/functions/v1/send-booking-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'yahyaasya34'
    ),
    body := jsonb_build_object(
      'event', 'rescheduled',
      'booking_id', v_booking_id,
      'old_slot_date', v_old_slot_date,
      'old_start_time', v_old_start_time,
      'old_end_time', v_old_end_time
    )
  );

  perform net.http_post(
    url := 'https://tccsrdgjephbqoblygpw.supabase.co/functions/v1/telegram-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'yahyaasya34'
    ),
    body := jsonb_build_object(
      'event', 'rescheduled',
      'booking_id', v_booking_id,
      'old_slot_date', v_old_slot_date,
      'old_start_time', v_old_start_time,
      'old_end_time', v_old_end_time
    )
  );

  return query select v_booking_id, p_code, v_slot_date, v_start_time, v_end_time;
end;
$$;
