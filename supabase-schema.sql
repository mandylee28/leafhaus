-- Leafhaus — Supabase (PostgreSQL) schema
-- Run this whole file in the Supabase Dashboard: SQL Editor > New query > paste > Run.
-- It is safe to run more than once: seed inserts use ON CONFLICT DO NOTHING.

create extension if not exists "pgcrypto";

-- ---------- Reference tables ----------

create table if not exists stores (
  id int generated always as identity primary key,
  name text not null unique
);

create table if not exists drinks (
  id int generated always as identity primary key,
  name text not null,
  price numeric(10, 2) not null,
  category text not null,
  description text not null default '',
  color text not null default '#a97c2f',
  bg text not null default '#f5ead2'
);

create table if not exists vouchers (
  code text primary key,
  discount_rate numeric(4, 2) not null
);

-- ---------- Orders ----------

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  pickup_number text not null,
  store text not null,
  subtotal numeric(10, 2) not null,
  discount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  voucher_code text,
  payment text not null,
  leaves int not null default 15,
  status int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  name text not null,
  size text not null,
  ice text not null,
  sweet text not null,
  qty int not null,
  unit_price numeric(10, 2) not null
);

create index if not exists order_items_order_id_idx on order_items (order_id);
create index if not exists orders_created_at_idx on orders (created_at desc);

-- ---------- Row Level Security ----------

alter table stores enable row level security;
alter table drinks enable row level security;
alter table vouchers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Anyone (anon) can read the menu, stores and vouchers.
drop policy if exists "anon can read stores" on stores;
create policy "anon can read stores" on stores
  for select to anon using (true);

drop policy if exists "anon can read drinks" on drinks;
create policy "anon can read drinks" on drinks
  for select to anon using (true);

drop policy if exists "anon can read vouchers" on vouchers;
create policy "anon can read vouchers" on vouchers
  for select to anon using (true);

-- Anyone (anon) can place orders, read orders, and update an order's status
-- (so the tracker can advance). There is no login in this app.
drop policy if exists "anon can insert orders" on orders;
create policy "anon can insert orders" on orders
  for insert to anon with check (true);

drop policy if exists "anon can read orders" on orders;
create policy "anon can read orders" on orders
  for select to anon using (true);

drop policy if exists "anon can update orders" on orders;
create policy "anon can update orders" on orders
  for update to anon using (true) with check (true);

drop policy if exists "anon can insert order items" on order_items;
create policy "anon can insert order items" on order_items
  for insert to anon with check (true);

drop policy if exists "anon can read order items" on order_items;
create policy "anon can read order items" on order_items
  for select to anon using (true);

-- ---------- Seed data ----------

insert into stores (id, name) overriding system value values
  (1, 'Leafhaus MY Horizon Mall'),
  (2, 'Leafhaus MY Eco Botanic'),
  (3, 'Leafhaus MY Aeon Bukit Indah')
on conflict (id) do nothing;

insert into drinks (id, name, price, category, description, color, bg) overriding system value values
  (1, 'Jasmine Matcha Pure Tea', 11.90, 'Matcha', 'Jasmine green tea with matcha', '#7a9b57', '#eef3e4'),
  (2, 'Jasmine Green Milk Tea', 12.90, 'Milk Tea', 'Jasmine green tea, fresh milk', '#b9c98a', '#f2f4e2'),
  (3, 'Brown Sugar Pearl Milk Tea', 13.90, 'Milk Tea', 'Brown sugar pearls, milk tea', '#8a5a33', '#f3e7d8'),
  (4, 'White Peach Oolong Tea', 12.90, 'Fruit Tea', 'White peach, roasted oolong', '#e8a0a8', '#fbeeee'),
  (5, 'Mango Green Tea', 11.90, 'Fruit Tea', 'Fresh mango, jasmine green tea', '#f0a832', '#fdf3dd'),
  (6, 'Roasted Oolong Milk Tea', 12.90, 'Milk Tea', 'Roasted oolong, fresh milk', '#a97c2f', '#f5ead2'),
  (7, 'Lemon Honey Black Tea', 10.90, 'Pure Tea', 'Lemon, honey, black tea', '#d9b23a', '#fdf6da')
on conflict (id) do nothing;

insert into vouchers (code, discount_rate) values
  ('WELCOME50', 0.5),
  ('TEA20', 0.2),
  ('LEAF10', 0.1)
on conflict (code) do nothing;

-- Keep the identity sequences past the seeded ids.
select setval(pg_get_serial_sequence('stores', 'id'), (select max(id) from stores));
select setval(pg_get_serial_sequence('drinks', 'id'), (select max(id) from drinks));
