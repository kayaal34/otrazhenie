-- =========================================================================
-- Патч 005: ручная оплата переводом вместо онлайн-эквайринга.
--
-- Меняет бизнес-логику:
--   1. confirm_booking() → create_booking() — теперь создаёт бронь сразу
--      со статусом 'pending_payment' (оплата ещё не подтверждена), без
--      параметров payment_provider/payment_id — им просто неоткуда взяться
--      до реальной оплаты. Слоты, как и раньше, сразу переходят в 'booked'
--      (это уже не про 15-минутный лок, а про постоянную бронь до
--      подтверждения или отмены администратором).
--   2. admin_confirm_payment() — новая функция: администратор вручную
--      подтверждает получение перевода, бронь становится 'confirmed'.
--   3. admin_cancel_booking() — теперь умеет отменять и неоплаченные брони
--      (возврат в этом случае 0 — платить ещё было нечего).
--   4. Telegram-триггер шлёт три разных события: 'pending_payment' (сразу
--      после брони — ждём чек), 'confirmed' (после вашего подтверждения),
--      'cancelled' (без изменений).
--
-- Безопасно выполнять повторно.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. create_booking() — замена confirm_booking() под ручную оплату
-- -------------------------------------------------------------------------

drop function if exists confirm_booking(
  uuid, text, text, text, uuid, int, boolean, text, boolean, int, text, text
);

create or replace function create_booking(
  p_hold_token uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_background_id uuid,
  p_guests_count int,
  p_with_pet boolean,
  p_comment text,
  p_pdn_consent boolean,
  p_duration_hours int
)
returns table (booking_id uuid, booking_code text)
language plpgsql
security definer
as $$
declare
  v_slot_ids uuid[];
  v_price int;
  v_booking_id uuid;
  v_code text;
begin
  select array_agg(id) into v_slot_ids
  from slots
  where locked_by_token = p_hold_token
    and status = 'locked'
    and locked_until > now();

  if v_slot_ids is null or array_length(v_slot_ids, 1) is distinct from p_duration_hours then
    raise exception 'HOLD_EXPIRED_OR_INVALID';
  end if;

  select price_kopecks into v_price
  from pricing_rules where duration_hours = p_duration_hours;

  if v_price is null then
    raise exception 'NO_PRICING_RULE_FOR_DURATION';
  end if;

  v_code := 'OTR-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into bookings (
    booking_code, client_name, client_phone, client_email,
    background_id, guests_count, with_pet, comment, pdn_consent,
    duration_hours, total_price_kopecks, status,
    payment_provider, payment_id, paid_at
  ) values (
    v_code, p_client_name, p_client_phone, p_client_email,
    p_background_id, p_guests_count, p_with_pet, p_comment, p_pdn_consent,
    p_duration_hours, v_price, 'pending_payment',
    'bank_transfer', null, null
  )
  returning id into v_booking_id;

  insert into booking_slots (booking_id, slot_id)
  select v_booking_id, unnest(v_slot_ids);

  update slots
  set status = 'booked', locked_until = null, locked_by_token = null
  where id = any(v_slot_ids);

  return query select v_booking_id, v_code;
end;
$$;

-- -------------------------------------------------------------------------
-- 2. admin_confirm_payment() — ручное подтверждение оплаты администратором
-- -------------------------------------------------------------------------

create or replace function admin_confirm_payment(p_booking_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  update bookings
  set status = 'confirmed', paid_at = now()
  where id = p_booking_id and status = 'pending_payment';

  if not found then
    raise exception 'BOOKING_NOT_PENDING';
  end if;
end;
$$;

-- -------------------------------------------------------------------------
-- 3. admin_cancel_booking() — учитывает неоплаченные брони (возврат 0)
-- -------------------------------------------------------------------------

create or replace function admin_cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_status text;
  v_refund int;
begin
  if not is_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  select status into v_status from bookings where id = p_booking_id;

  if v_status is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if v_status = 'confirmed' then
    select compute_refund_kopecks(p_booking_id) into v_refund;
  else
    v_refund := 0;
  end if;

  update bookings
  set status = 'cancelled', cancelled_at = now(), refund_kopecks = v_refund
  where id = p_booking_id and status in ('confirmed', 'pending_payment');

  if not found then
    raise exception 'BOOKING_NOT_CANCELLABLE';
  end if;

  update slots
  set status = 'available', locked_until = null, locked_by_token = null
  where id in (select slot_id from booking_slots where booking_id = p_booking_id);
end;
$$;

-- -------------------------------------------------------------------------
-- 4. Telegram-триггер — три события вместо одного
-- -------------------------------------------------------------------------

create or replace function notify_telegram_on_booking()
returns trigger
language plpgsql
security definer
as $$
declare
  v_event text;
begin
  if TG_OP = 'INSERT' and NEW.status = 'pending_payment' then
    v_event := 'pending_payment';
  elsif TG_OP = 'UPDATE' and NEW.status = 'confirmed' and OLD.status is distinct from 'confirmed' then
    v_event := 'confirmed';
  elsif TG_OP = 'UPDATE' and NEW.status = 'cancelled' and OLD.status is distinct from 'cancelled' then
    v_event := 'cancelled';
  else
    return NEW;
  end if;

  perform net.http_post(
    url := 'https://tccsrdgjephbqoblygpw.supabase.co/functions/v1/telegram-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'yahyaasya34'
    ),
    body := jsonb_build_object('event', v_event, 'booking_id', NEW.id)
  );

  return NEW;
end;
$$;

-- Триггер уже существует (создан в патче 004) и продолжает указывать на
-- эту же функцию по имени — пересоздавать его не нужно.
