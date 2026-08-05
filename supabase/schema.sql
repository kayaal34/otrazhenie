-- =========================================================================
-- «Отражение» — схема Supabase (Postgres)
-- Применение: Supabase Dashboard → SQL Editor → вставить целиком → Run
-- (или через Supabase CLI: supabase db push)
-- =========================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- -------------------------------------------------------------------------
-- 1. backgrounds — фоны, которые можно выбрать при бронировании
-- -------------------------------------------------------------------------
create table if not exists backgrounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- «Белый», «Чёрный», «Розовая ткань»
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 2. pricing_rules — таблица цен по длительности (правишь в SQL/дашборде,
--    без изменения кода — формула для 3+ часов пока не определена владелицей,
--    добавь новую строку с duration_hours, когда решишь тарификацию)
-- -------------------------------------------------------------------------
create table if not exists pricing_rules (
  duration_hours int primary key,
  price_kopecks int not null,       -- храним в копейках, чтобы избежать float-ошибок
  label text not null
);

insert into pricing_rules (duration_hours, price_kopecks, label) values
  (1, 300000, '1 час'),
  (2, 550000, '2 часа')
on conflict (duration_hours) do nothing;

-- -------------------------------------------------------------------------
-- 3. slots — атомарные часовые окна, которые администратор открывает вручную
-- -------------------------------------------------------------------------
create table if not exists slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'available'
    check (status in ('available', 'locked', 'booked')),
  locked_until timestamptz,         -- истекает через 10-15 минут после начала брони
  locked_by_token uuid,             -- анонимный токен текущей сессии бронирования
  created_at timestamptz not null default now(),
  unique (slot_date, start_time)
);

create index if not exists slots_date_status_idx on slots (slot_date, status);

-- -------------------------------------------------------------------------
-- 4. bookings — брони клиентов
-- -------------------------------------------------------------------------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,     -- напр. OTR-7F3K2X, для сверки фото с клиентом

  client_name text not null,
  client_phone text not null,
  client_email text not null,

  background_id uuid references backgrounds (id),
  guests_count int not null default 1,
  with_pet boolean not null default false,
  comment text,
  pdn_consent boolean not null,          -- согласие на обработку персональных данных

  duration_hours int not null references pricing_rules (duration_hours),
  total_price_kopecks int not null,      -- снимок цены на момент брони

  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'confirmed', 'cancelled', 'completed')),

  payment_provider text,                 -- yookassa / cloudpayments / tkassa
  payment_id text,
  paid_at timestamptz,

  cancelled_at timestamptz,
  refund_kopecks int,

  created_at timestamptz not null default now()
);

create index if not exists bookings_code_idx on bookings (booking_code);
create index if not exists bookings_status_idx on bookings (status);

-- -------------------------------------------------------------------------
-- 5. booking_slots — связь брони с одним или несколькими часовыми слотами
-- -------------------------------------------------------------------------
create table if not exists booking_slots (
  booking_id uuid not null references bookings (id) on delete cascade,
  slot_id uuid not null references slots (id),
  primary key (booking_id, slot_id)
);

-- -------------------------------------------------------------------------
-- 6. gallery_photos — фото гостей для галереи (загружаются через админку)
-- -------------------------------------------------------------------------
create table if not exists gallery_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,       -- путь в Supabase Storage (bucket "gallery")
  caption text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gallery_published_idx on gallery_photos (is_published, sort_order);

-- -------------------------------------------------------------------------
-- 7. admin_users — allow-list администраторов (владелица + при необходимости
--    ассистент); связывается вручную с auth.users после регистрации в Supabase Auth
-- -------------------------------------------------------------------------
create table if not exists admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from admin_users where user_id = auth.uid()
  );
$$;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table backgrounds enable row level security;
alter table pricing_rules enable row level security;
alter table slots enable row level security;
alter table bookings enable row level security;
alter table booking_slots enable row level security;
alter table gallery_photos enable row level security;
alter table admin_users enable row level security;

-- backgrounds: читают все активные, пишет только админ
create policy "backgrounds_public_read" on backgrounds
  for select using (is_active = true or is_admin());
create policy "backgrounds_admin_write" on backgrounds
  for all using (is_admin()) with check (is_admin());

-- pricing_rules: читают все, пишет только админ
create policy "pricing_public_read" on pricing_rules
  for select using (true);
create policy "pricing_admin_write" on pricing_rules
  for all using (is_admin()) with check (is_admin());

-- slots: читают все (нужно видеть занятые/свободные), напрямую пишет
-- только админ — временная блокировка слота выполняется через функцию
-- hold_slots() ниже (SECURITY DEFINER), а не прямым UPDATE от анонима
create policy "slots_public_read" on slots
  for select using (true);
create policy "slots_admin_write" on slots
  for insert with check (is_admin());
create policy "slots_admin_update" on slots
  for update using (is_admin());
create policy "slots_admin_delete" on slots
  for delete using (is_admin());

-- bookings: содержат ПДн — публичного доступа на чтение нет вообще.
-- Создание брони идёт через функцию create_booking() ниже, а не INSERT
-- напрямую; админ видит и правит все брони.
create policy "bookings_admin_all" on bookings
  for all using (is_admin()) with check (is_admin());

-- booking_slots: аналогично — доступ только администратору
create policy "booking_slots_admin_all" on booking_slots
  for all using (is_admin()) with check (is_admin());

-- gallery_photos: читают все опубликованные, пишет только админ
create policy "gallery_public_read" on gallery_photos
  for select using (is_published = true or is_admin());
create policy "gallery_admin_write" on gallery_photos
  for all using (is_admin()) with check (is_admin());

-- admin_users: виден только самим админам (для проверки собственного статуса)
create policy "admin_users_self_read" on admin_users
  for select using (is_admin());

-- =========================================================================
-- Функции бизнес-логики (вызываются через supabase.rpc(...) с anon-ключом
-- или из Edge Functions с service_role — так гонки и race conditions
-- обрабатываются атомарно в БД, а не на клиенте)
-- =========================================================================

-- Ставит временную блокировку (10-15 минут) на один или несколько
-- смежных слотов, чтобы никто другой не мог начать бронирование этого же
-- времени, пока клиент оформляет оплату.
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

-- Снимает истёкшие блокировки обратно в 'available'.
-- Вызывать по расписанию (pg_cron, каждую минуту) — см. заметку внизу файла.
create or replace function release_expired_holds()
returns void
language sql
security definer
as $$
  update slots
  set status = 'available', locked_until = null, locked_by_token = null
  where status = 'locked' and locked_until < now();
$$;

-- Создаёт бронь по уже удержанным (locked) слотам данного hold_token,
-- переводит их в 'booked'. Вызывается после успешной оплаты
-- (из платёжного вебхука/Edge Function).
create or replace function confirm_booking(
  p_hold_token uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_background_id uuid,
  p_guests_count int,
  p_with_pet boolean,
  p_comment text,
  p_pdn_consent boolean,
  p_duration_hours int,
  p_payment_provider text,
  p_payment_id text
)
returns table (booking_id uuid, booking_code text)
language plpgsql
security definer
as $$
declare
  v_slot_ids uuid[];
  v_price int;
  v_booking_id uuid;
  v_code text;
begin
  select array_agg(id) into v_slot_ids
  from slots
  where locked_by_token = p_hold_token and status = 'locked';

  if v_slot_ids is null or array_length(v_slot_ids, 1) is distinct from p_duration_hours then
    raise exception 'HOLD_EXPIRED_OR_INVALID';
  end if;

  select price_kopecks into v_price
  from pricing_rules where duration_hours = p_duration_hours;

  if v_price is null then
    raise exception 'NO_PRICING_RULE_FOR_DURATION';
  end if;

  v_code := 'OTR-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into bookings (
    booking_code, client_name, client_phone, client_email,
    background_id, guests_count, with_pet, comment, pdn_consent,
    duration_hours, total_price_kopecks, status,
    payment_provider, payment_id, paid_at
  ) values (
    v_code, p_client_name, p_client_phone, p_client_email,
    p_background_id, p_guests_count, p_with_pet, p_comment, p_pdn_consent,
    p_duration_hours, v_price, 'confirmed',
    p_payment_provider, p_payment_id, now()
  )
  returning id into v_booking_id;

  insert into booking_slots (booking_id, slot_id)
  select v_booking_id, unnest(v_slot_ids);

  update slots
  set status = 'booked', locked_until = null, locked_by_token = null
  where id = any(v_slot_ids);

  return query select v_booking_id, v_code;
end;
$$;

-- Считает сумму возврата по правилу 48 часов:
--   >= 48 часов до начала брони  → полный возврат
--   <  48 часов до начала брони  → 50% от оплаченной суммы
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
  select (s.slot_date + s.start_time)::timestamptz, b.total_price_kopecks
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

-- =========================================================================
-- Примечание по эксплуатации:
-- 1. Включить pg_cron (Supabase → Database → Extensions) и запланировать:
--      select cron.schedule('release-expired-holds', '* * * * *',
--        'select release_expired_holds();');
-- 2. Создать Storage bucket "gallery" (public read) для gallery_photos.
-- 3. После регистрации владелицы в Supabase Auth — добавить её user_id
--    в admin_users вручную (SQL Editor):
--      insert into admin_users (user_id) values ('<uuid из auth.users>');
-- 4. Оплата и вебхуки платёжного провайдера обрабатываются в Edge Function
--    с service_role ключом — она вызывает confirm_booking() после
--    подтверждения платежа. hold_slots() вызывается с anon-ключом сразу
--    при выборе слота клиентом (до оплаты).
-- =========================================================================
