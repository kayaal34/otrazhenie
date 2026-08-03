-- =========================================================================
-- Патч 023: Telegram-уведомления при покупке подарочного сертификата —
-- по аналогии с уведомлениями о брони (patch_004/005).
--
--   1. Новая покупка (INSERT, status = 'pending_payment') — «ждём оплату».
--   2. Подтверждение оплаты администратором (UPDATE → 'confirmed') —
--      «сертификат оплачен».
--
-- Использует ту же Edge Function telegram-notify (уже умеет отличать
-- бронь от сертификата по тому, какое поле пришло — booking_id или
-- certificate_id) и тот же общий секрет, что и остальные вебхуки проекта.
--
-- Безопасно выполнять повторно.
-- =========================================================================

create or replace function notify_telegram_on_certificate()
returns trigger
language plpgsql
security definer
as $$
declare
  v_event text;
begin
  if TG_OP = 'INSERT' and NEW.status = 'pending_payment' then
    v_event := 'purchased';
  elsif TG_OP = 'UPDATE' and NEW.status = 'confirmed' and OLD.status is distinct from 'confirmed' then
    v_event := 'confirmed';
  else
    return NEW;
  end if;

  perform net.http_post(
    url := 'https://tccsrdgjephbqoblygpw.supabase.co/functions/v1/telegram-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'yahyaasya34'
    ),
    body := jsonb_build_object('event', v_event, 'certificate_id', NEW.id)
  );

  return NEW;
end;
$$;

drop trigger if exists gift_certificates_notify_telegram on gift_certificates;
create trigger gift_certificates_notify_telegram
  after insert or update on gift_certificates
  for each row
  execute function notify_telegram_on_certificate();
