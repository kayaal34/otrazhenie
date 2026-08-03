-- =========================================================================
-- Патч 019: исправляет ошибку "column reference price_kopecks is
-- ambiguous" в create_gift_certificate().
--
-- Причина: RETURNS TABLE(..., price_kopecks int) неявно создаёт
-- одноимённую PL/pgSQL-переменную price_kopecks, которая конфликтует с
-- колонкой pricing_rules.price_kopecks в необорудованном SELECT —
-- Postgres не может понять, что имелось в виду. Исправление —
-- квалифицировать колонку алиасом таблицы.
--
-- Безопасно выполнять повторно.
-- =========================================================================

create or replace function create_gift_certificate(
  p_duration_hours int,
  p_buyer_name text,
  p_buyer_phone text,
  p_buyer_email text
)
returns table (certificate_id uuid, code text, price_kopecks int)
language plpgsql
security definer
as $$
declare
  v_price int;
  v_code text;
  v_id uuid;
begin
  select pr.price_kopecks into v_price
  from pricing_rules pr where pr.duration_hours = p_duration_hours;

  if v_price is null then
    raise exception 'NO_PRICING_RULE_FOR_DURATION';
  end if;

  v_code := 'GIFT-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into gift_certificates (
    code, duration_hours, price_kopecks, buyer_name, buyer_phone, buyer_email,
    status, payment_provider
  ) values (
    v_code, p_duration_hours, v_price, trim(p_buyer_name), trim(p_buyer_phone),
    trim(p_buyer_email), 'pending_payment', 'bank_transfer'
  )
  returning id into v_id;

  return query select v_id, v_code, v_price;
end;
$$;
