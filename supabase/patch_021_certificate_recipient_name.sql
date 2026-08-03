-- =========================================================================
-- Патч 021: у сертификата теперь отдельно записано имя получателя —
-- того, для кого он оформляется, а не только имя покупателя (buyer_name,
-- нужно для связи с покупателем при оплате).
--
-- create_gift_certificate() получает новый параметр, поэтому сначала
-- дропаем функцию со старой сигнатурой.
--
-- Безопасно выполнять повторно.
-- =========================================================================

alter table gift_certificates
  add column if not exists recipient_name text not null default '';

drop function if exists create_gift_certificate(int, text, text, text);

create or replace function create_gift_certificate(
  p_duration_hours int,
  p_recipient_name text,
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
    code, duration_hours, price_kopecks, recipient_name, buyer_name, buyer_phone,
    buyer_email, status, payment_provider
  ) values (
    v_code, p_duration_hours, v_price, trim(p_recipient_name), trim(p_buyer_name),
    trim(p_buyer_phone), trim(p_buyer_email), 'pending_payment', 'bank_transfer'
  )
  returning id into v_id;

  return query select v_id, v_code, v_price;
end;
$$;
