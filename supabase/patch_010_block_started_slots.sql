-- =========================================================================
-- Патч 010: запрещает удерживать (и тем самым бронировать) слот, время
-- начала которого уже наступило — клиент физически не успеет на съёмку.
--
-- Раньше hold_slots() проверял только status/locked_until, без сравнения
-- с текущим временем — слот на 14:00 можно было забронировать и в 14:30.
-- Теперь дополнительно сверяем (slot_date + start_time) с now(), по тому
-- же принципу, что уже используется в compute_refund_kopecks().
--
-- Клиентская часть (src/lib/booking.ts, groupConsecutiveSlots) уже не
-- показывает такие слоты в списке выбора — эта проверка на сервере не
-- даёт обойти ограничение прямым вызовом RPC.
--
-- Безопасно выполнять повторно.
-- =========================================================================

create or replace function hold_slots(
  p_slot_ids uuid[],
  p_hold_token uuid,
  p_hold_minutes int default 15
)
returns void
language plpgsql
security definer
as $$
begin
  -- блокируем строки, чтобы исключить гонку между параллельными запросами
  perform 1 from slots where id = any(p_slot_ids) for update;

  if exists (
    select 1 from slots
    where id = any(p_slot_ids)
      and (slot_date + start_time)::timestamptz <= now()
  ) then
    raise exception 'SLOT_ALREADY_STARTED';
  end if;

  if exists (
    select 1 from slots
    where id = any(p_slot_ids)
      and not (
        status = 'available'
        or (status = 'locked' and locked_until < now())
      )
  ) then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  update slots
  set status = 'locked',
      locked_until = now() + make_interval(mins => p_hold_minutes),
      locked_by_token = p_hold_token
  where id = any(p_slot_ids);
end;
$$;
