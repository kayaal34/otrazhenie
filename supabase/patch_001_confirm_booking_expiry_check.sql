-- =========================================================================
-- Патч 001: confirm_booking() не проверял locked_until при подтверждении.
--
-- Проблема: release_expired_holds() снимает просроченные блокировки только
-- раз в минуту (по расписанию pg_cron). Между истечением 15-минутного
-- окна и следующим тиком cron confirm_booking() мог успешно подтвердить
-- бронь по формально просроченному, но ещё не сброшенному held-слоту.
--
-- Безопасно выполнять повторно (create or replace).
-- =========================================================================

create or replace function confirm_booking(
  p_hold_token uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_background_id uuid,
  p_guests_count int,
  p_with_pet boolean,
  p_comment text,
  p_pdn_consent boolean,
  p_duration_hours int,
  p_payment_provider text,
  p_payment_id text
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
    p_duration_hours, v_price, 'confirmed',
    p_payment_provider, p_payment_id, now()
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
