-- =========================================================================
-- Патч 017: подарочные сертификаты.
--
--   1. gift_certificates — таблица проданных сертификатов (код, часы,
--      цена-снимок, данные покупателя, статус). Публичного SELECT нет —
--      доступ только через create_gift_certificate() (создание) и
--      админ-панель (is_admin()).
--   2. create_gift_certificate() — публичная RPC: считает цену по
--      pricing_rules (сервер — источник истины), создаёт запись со
--      статусом 'pending_payment', возвращает код и сумму к оплате.
--   3. admin_confirm_certificate_payment() — администратор подтверждает
--      получение оплаты (по аналогии с admin_confirm_payment для броней).
--   4. Триггер на переход в 'confirmed' — дёргает Edge Function
--      send-certificate-email (тот же общий секрет, что и у остальных
--      вебхуков в проекте).
--   5. admin_resend_certificate_email() — ручная переотправка письма.
--
-- Безопасно выполнять повторно.
-- =========================================================================

create table if not exists gift_certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  duration_hours int not null references pricing_rules (duration_hours),
  price_kopecks int not null,
  buyer_name text not null,
  buyer_phone text not null,
  buyer_email text not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'cancelled')),
  payment_provider text,
  paid_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists gift_certificates_status_idx on gift_certificates (status);

alter table gift_certificates enable row level security;

drop policy if exists "gift_certificates_admin_all" on gift_certificates;
create policy "gift_certificates_admin_all" on gift_certificates
  for all using (is_admin()) with check (is_admin());

-- -------------------------------------------------------------------------
-- create_gift_certificate() — публичная покупка сертификата
-- -------------------------------------------------------------------------

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
  select price_kopecks into v_price
  from pricing_rules where duration_hours = p_duration_hours;

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

-- -------------------------------------------------------------------------
-- admin_confirm_certificate_payment()
-- -------------------------------------------------------------------------

create or replace function admin_confirm_certificate_payment(p_certificate_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  update gift_certificates
  set status = 'confirmed', paid_at = now()
  where id = p_certificate_id and status = 'pending_payment';

  if not found then
    raise exception 'CERTIFICATE_NOT_PENDING';
  end if;
end;
$$;

-- -------------------------------------------------------------------------
-- Триггер: подтверждение оплаты → письмо клиенту с сертификатом
-- -------------------------------------------------------------------------

create or replace function notify_certificate_email()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'UPDATE' and NEW.status = 'confirmed' and OLD.status is distinct from 'confirmed' then
    perform net.http_post(
      url := 'https://tccsrdgjephbqoblygpw.supabase.co/functions/v1/send-certificate-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', 'yahyaasya34'
      ),
      body := jsonb_build_object('certificate_id', NEW.id)
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists gift_certificates_notify_email on gift_certificates;
create trigger gift_certificates_notify_email
  after update on gift_certificates
  for each row
  execute function notify_certificate_email();

-- -------------------------------------------------------------------------
-- admin_resend_certificate_email() — ручная переотправка
-- -------------------------------------------------------------------------

create or replace function admin_resend_certificate_email(p_certificate_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  perform net.http_post(
    url := 'https://tccsrdgjephbqoblygpw.supabase.co/functions/v1/send-certificate-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'yahyaasya34'
    ),
    body := jsonb_build_object('certificate_id', p_certificate_id)
  );
end;
$$;
