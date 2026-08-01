-- =========================================================================
-- Патч 007: досрочное снятие удержания слота + email-подтверждение оплаты.
--
--   1. release_hold() — клиент нажимает «Отменить и выбрать другое время»
--      на экране формы, слот освобождается сразу, а не только через
--      15-минутный cron-таймаут.
--   2. Триггер на bookings: при переходе pending_payment → confirmed
--      (администратор нажал «Подтвердить оплату») дёргает Edge Function
--      send-booking-email, которая отправляет клиенту письмо через Resend.
--
-- ПЕРЕД ЗАПУСКОМ замените плейсхолдер <WEBHOOK_SHARED_SECRET> на тот же
-- секрет, что уже используется в патче 004 (переменная WEBHOOK_SHARED_SECRET
-- у Edge Functions) — он же защищает и эту функцию от вызовов извне.
-- Функция send-booking-email должна быть уже задеплоена (см. инструкцию
-- в чате), иначе триггер будет исправно, но безрезультатно дёргать
-- несуществующий URL.
--
-- Безопасно выполнять повторно.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. release_hold() — вызывается анонимно, знание hold_token достаточно
--    (тот же принцип доверия, что и у hold_slots/create_booking)
-- -------------------------------------------------------------------------

create or replace function release_hold(p_hold_token uuid)
returns void
language sql
security definer
as $$
  update slots
  set status = 'available', locked_until = null, locked_by_token = null
  where locked_by_token = p_hold_token and status = 'locked';
$$;

-- -------------------------------------------------------------------------
-- 2. Триггер на подтверждение оплаты → email клиенту
-- -------------------------------------------------------------------------

create or replace function notify_email_on_confirm()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'UPDATE' and NEW.status = 'confirmed' and OLD.status is distinct from 'confirmed' then
    perform net.http_post(
      url := 'https://tccsrdgjephbqoblygpw.supabase.co/functions/v1/send-booking-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', 'yahyaasya34'
      ),
      body := jsonb_build_object('booking_id', NEW.id)
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists bookings_notify_email on bookings;
create trigger bookings_notify_email
  after update on bookings
  for each row
  execute function notify_email_on_confirm();
