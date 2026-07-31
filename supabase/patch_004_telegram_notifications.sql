-- =========================================================================
-- Патч 004: Telegram-уведомления администратору (Этап 4).
--
-- ПЕРЕД ЗАПУСКОМ замените два плейсхолдера ниже:
--   <EDGE_FUNCTION_URL>      — вида https://<project-ref>.supabase.co/functions/v1/telegram-notify
--   <WEBHOOK_SHARED_SECRET>  — та же строка, что задана в секрете
--                              WEBHOOK_SHARED_SECRET у Edge Function telegram-notify
--
-- Функция сама должна быть уже задеплоена (см. инструкцию в чате) —
-- иначе триггер будет исправно вызывать несуществующий URL и ничего не
-- сломает (net.http_post асинхронный, ошибки только в логах), но и не
-- отправит сообщения.
--
-- Безопасно выполнять повторно.
-- =========================================================================

create extension if not exists pg_net;

create or replace function notify_telegram_on_booking()
returns trigger
language plpgsql
security definer
as $$
declare
  v_event text;
begin
  if TG_OP = 'INSERT' and NEW.status = 'confirmed' then
    v_event := 'new_booking';
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

drop trigger if exists bookings_notify_telegram on bookings;
create trigger bookings_notify_telegram
  after insert or update on bookings
  for each row
  execute function notify_telegram_on_booking();