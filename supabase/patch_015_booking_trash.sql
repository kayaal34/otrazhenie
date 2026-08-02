-- =========================================================================
-- Патч 015: «Корзина» для броней вместо мгновенного удаления.
--
--   1. bookings.deleted_at — мягкое удаление. Поштучное удаление любой
--      брони (из вкладки «Брони») теперь просто проставляет эту метку,
--      а не стирает запись — бронь пропадает из основного списка и
--      появляется в «Корзине».
--   2. admin_empty_trash() — новая функция: безвозвратно стирает все
--      брони с проставленным deleted_at. Только так данные удаляются
--      физически.
--   3. admin_cleanup_old_bookings() — переработана: раньше жёстко
--      удаляла только отменённые брони старше 30 дней. Теперь —
--      перемещает В КОРЗИНУ (soft-delete) ЛЮБЫЕ брони старше указанной
--      даты, без ограничения снизу (владелица явно попросила убрать
--      порог в 30 дней — это больше не рискованно, т.к. теперь это
--      восстановимая операция, а не окончательное удаление).
--   4. booking_details — добавлена колонка deleted_at, чтобы клиент мог
--      отдельно показывать активные брони и «Корзину» из одного view.
--
-- Безопасно выполнять повторно.
-- =========================================================================

alter table bookings
  add column if not exists deleted_at timestamptz;

create index if not exists bookings_deleted_at_idx on bookings (deleted_at);

-- -------------------------------------------------------------------------
-- admin_empty_trash() — безвозвратная очистка корзины
-- -------------------------------------------------------------------------

create or replace function admin_empty_trash()
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

  delete from bookings where deleted_at is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------
-- admin_cleanup_old_bookings() — теперь массовое перемещение в корзину,
-- без ограничения по давности и без ограничения по статусу брони.
-- -------------------------------------------------------------------------

create or replace function admin_cleanup_old_bookings(p_older_than date)
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

  update bookings
  set deleted_at = now()
  where created_at < p_older_than::timestamptz
    and deleted_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------
-- booking_details — добавляем deleted_at
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
  b.background_kopecks,
  b.discount_kopecks,
  b.promo_code,
  b.status,
  b.payment_provider,
  b.paid_at,
  b.cancelled_at,
  b.refund_kopecks,
  b.created_at,
  b.deleted_at,
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
