-- =========================================================================
-- Патч 011: исправляет ошибку часового пояса в двух функциях, где
-- (slot_date + start_time) приводится к timestamptz.
--
-- Проблема: `(date + time)::timestamptz` интерпретирует наивную дату-время
-- в ТЕКУЩЕМ часовом поясе сессии Postgres — по умолчанию это UTC, а не
-- локальное время Камышлова (UTC+5). Из-за этого «14:00» читается как
-- 14:00 UTC (= 19:00 по Камышлову) — то есть на 5 часов позже, чем должно
-- быть на самом деле.
--
-- Это ломало сразу две вещи:
--   1. hold_slots() (патч 010) — проверка «слот уже начался» эффективно
--      не срабатывала часов 5 после реального начала слота.
--   2. compute_refund_kopecks() (исходная схема) — правило «48 часов до
--      брони» из-за того же сдвига могло начать/закончить действовать на
--      5 часов раньше или позже, чем нужно, — то есть сумма возврата
--      клиенту могла считаться неверно.
--
-- Исправление: `AT TIME ZONE 'Asia/Yekaterinburg'` — корректно трактует
-- наивную дату-время как локальное время Камышлова при переводе в
-- timestamptz. У России нет перехода на летнее время, так что этот пояс
-- стабилен и не потребует дальнейших правок.
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
  perform 1 from slots where id = any(p_slot_ids) for update;

  if exists (
    select 1 from slots
    where id = any(p_slot_ids)
      and (slot_date + start_time) at time zone 'Asia/Yekaterinburg' <= now()
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

create or replace function compute_refund_kopecks(p_booking_id uuid)
returns int
language plpgsql
security definer
as $$
declare
  v_start timestamptz;
  v_total int;
  v_hours_left numeric;
begin
  select (s.slot_date + s.start_time) at time zone 'Asia/Yekaterinburg', b.total_price_kopecks
  into v_start, v_total
  from bookings b
  join booking_slots bs on bs.booking_id = b.id
  join slots s on s.id = bs.slot_id
  where b.id = p_booking_id
  order by s.start_time asc
  limit 1;

  v_hours_left := extract(epoch from (v_start - now())) / 3600;

  if v_hours_left >= 48 then
    return v_total;
  else
    return round(v_total * 0.5);
  end if;
end;
$$;
