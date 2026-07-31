-- =========================================================================
-- Тестовые данные для Этапа 1 (локальная разработка / демо).
-- Выполнить один раз в Supabase SQL Editor после schema.sql.
-- В проде слоты создаёт администратор вручную через админку (Этап 2) —
-- этот скрипт нужен только чтобы было что бронировать при разработке.
-- =========================================================================

insert into backgrounds (name, sort_order) values
  ('Белый', 1),
  ('Чёрный', 2),
  ('Розовая ткань', 3)
on conflict do nothing;

-- Часовые слоты 10:00–20:00 на ближайшие 14 дней
insert into slots (slot_date, start_time, end_time)
select
  d::date as slot_date,
  (h || ':00')::time as start_time,
  ((h + 1) || ':00')::time as end_time
from generate_series(current_date, current_date + interval '13 days', interval '1 day') as d
cross join generate_series(10, 19) as h
on conflict (slot_date, start_time) do nothing;
