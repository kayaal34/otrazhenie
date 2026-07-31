-- =========================================================================
-- Патч 006: дополнительная опция (+500₽) и промокоды.
--
--   1. bookings получает addon_kopecks / discount_kopecks / promo_code —
--      разбивку итоговой суммы, а не только total_price_kopecks.
--   2. promo_codes — таблица промокодов, управляется только администратором
--      (RLS не даёт анониму читать таблицу напрямую — иначе можно было бы
--      перебором узнать все действующие коды).
--   3. validate_promo_code() — публичная RPC для мгновенного пересчёта
--      скидки на странице бронирования. Не тратит лимит использований —
--      это только предпросмотр.
--   4. create_booking() — пересобрана: сумма (база + допуслуга - скидка)
--      считается на сервере, промокод валидируется и списывается атомарно
--      (SELECT ... FOR UPDATE), чтобы при одновременных бронях лимит
--      использований не превышался.
--
-- Безопасно выполнять повторно.
-- =========================================================================

-- Цена допуслуги — фиксированная, храним прямо в функции (аналогично
-- pricing_rules, но это единственная опция, отдельная таблица избыточна).
-- 500 ₽ = 50000 копеек.

-- -------------------------------------------------------------------------
-- 1. Новые колонки bookings
-- -------------------------------------------------------------------------

alter table bookings
  add column if not exists addon_kopecks int not null default 0,
  add column if not exists discount_kopecks int not null default 0,
  add column if not exists promo_code text;

-- -------------------------------------------------------------------------
-- 2. promo_codes
-- -------------------------------------------------------------------------

create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value int not null check (discount_value > 0), -- percent: 1-100; fixed: копейки
  usage_limit int check (usage_limit is null or usage_limit > 0), -- null = без лимита
  usage_count int not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz, -- null = бессрочно
  created_at timestamptz not null default now()
);

-- Регистронезависимая уникальность — иначе "abc" и "ABC" уживутся как
-- разные строки и validate_promo_code() будет матчить произвольную из них.
create unique index if not exists promo_codes_code_upper_idx on promo_codes (upper(code));

alter table promo_codes enable row level security;

drop policy if exists "promo_codes_admin_all" on promo_codes;
create policy "promo_codes_admin_all" on promo_codes
  for all using (is_admin()) with check (is_admin());

-- Публичного SELECT нет намеренно — коды проверяются только через
-- validate_promo_code(), иначе анонимный пользователь мог бы вычитать
-- весь список действующих промокодов через API.

-- -------------------------------------------------------------------------
-- 3. validate_promo_code() — предпросмотр скидки для формы бронирования
-- -------------------------------------------------------------------------

create or replace function validate_promo_code(p_code text, p_subtotal_kopecks int)
returns table (valid boolean, discount_kopecks int, message text)
language plpgsql
security definer
as $$
declare
  v_promo promo_codes%rowtype;
  v_discount int;
begin
  select * into v_promo from promo_codes where upper(code) = upper(trim(p_code));

  if v_promo.id is null then
    return query select false, 0, 'Промокод не найден';
    return;
  end if;

  if not v_promo.is_active then
    return query select false, 0, 'Промокод больше не активен';
    return;
  end if;

  if v_promo.expires_at is not null and v_promo.expires_at < now() then
    return query select false, 0, 'Срок действия промокода истёк';
    return;
  end if;

  if v_promo.usage_limit is not null and v_promo.usage_count >= v_promo.usage_limit then
    return query select false, 0, 'Лимит использований промокода исчерпан';
    return;
  end if;

  if v_promo.discount_type = 'percent' then
    v_discount := (p_subtotal_kopecks * v_promo.discount_value) / 100;
  else
    v_discount := v_promo.discount_value;
  end if;

  v_discount := least(v_discount, p_subtotal_kopecks);

  return query select true, v_discount, 'Промокод применён';
end;
$$;

-- -------------------------------------------------------------------------
-- 4. create_booking() — учитывает допуслугу и промокод
-- -------------------------------------------------------------------------

drop function if exists create_booking(
  uuid, text, text, text, uuid, int, boolean, text, boolean, int
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
  p_duration_hours int,
  p_with_addon boolean,
  p_promo_code text
)
returns table (
  booking_id uuid,
  booking_code text,
  total_price_kopecks int,
  addon_kopecks int,
  discount_kopecks int
)
language plpgsql
security definer
as $$
declare
  v_slot_ids uuid[];
  v_base_price int;
  v_addon int := 0;
  v_subtotal int;
  v_discount int := 0;
  v_total int;
  v_promo promo_codes%rowtype;
  v_normalized_code text;
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

  select price_kopecks into v_base_price
  from pricing_rules where duration_hours = p_duration_hours;

  if v_base_price is null then
    raise exception 'NO_PRICING_RULE_FOR_DURATION';
  end if;

  if p_with_addon then
    v_addon := 50000; -- 500 ₽
  end if;

  v_subtotal := v_base_price + v_addon;

  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    v_normalized_code := upper(trim(p_promo_code));

    select * into v_promo from promo_codes where upper(code) = v_normalized_code for update;

    if v_promo.id is null then
      raise exception 'PROMO_NOT_FOUND';
    end if;
    if not v_promo.is_active then
      raise exception 'PROMO_INACTIVE';
    end if;
    if v_promo.expires_at is not null and v_promo.expires_at < now() then
      raise exception 'PROMO_EXPIRED';
    end if;
    if v_promo.usage_limit is not null and v_promo.usage_count >= v_promo.usage_limit then
      raise exception 'PROMO_LIMIT_REACHED';
    end if;

    if v_promo.discount_type = 'percent' then
      v_discount := (v_subtotal * v_promo.discount_value) / 100;
    else
      v_discount := v_promo.discount_value;
    end if;

    v_discount := least(v_discount, v_subtotal);

    update promo_codes set usage_count = usage_count + 1 where id = v_promo.id;
  end if;

  v_total := v_subtotal - v_discount;

  v_code := 'OTR-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into bookings (
    booking_code, client_name, client_phone, client_email,
    background_id, guests_count, with_pet, comment, pdn_consent,
    duration_hours, total_price_kopecks, addon_kopecks, discount_kopecks,
    promo_code, status, payment_provider, payment_id, paid_at
  ) values (
    v_code, p_client_name, p_client_phone, p_client_email,
    p_background_id, p_guests_count, p_with_pet, p_comment, p_pdn_consent,
    p_duration_hours, v_total, v_addon, v_discount,
    v_normalized_code, 'pending_payment', 'bank_transfer', null, null
  )
  returning id into v_booking_id;

  insert into booking_slots (booking_id, slot_id)
  select v_booking_id, unnest(v_slot_ids);

  update slots
  set status = 'booked', locked_until = null, locked_by_token = null
  where id = any(v_slot_ids);

  return query select v_booking_id, v_code, v_total, v_addon, v_discount;
end;
$$;

-- -------------------------------------------------------------------------
-- 5. booking_details — добавляем разбивку суммы
--
-- Новые колонки вставлены в середину списка, а не в конец — CREATE OR
-- REPLACE VIEW такое не позволяет (Postgres сверяет позиции колонок и
-- считает это переименованием). Поэтому пересоздаём view целиком.
-- -------------------------------------------------------------------------

drop view if exists booking_details;

create view booking_details
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
  b.addon_kopecks,
  b.discount_kopecks,
  b.promo_code,
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
