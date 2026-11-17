
-- ============================================================
-- APP-MULTI-RESTO
-- MIGRATION 004: TABLES AND QR
-- ============================================================

begin;

create table public.restaurant_tables (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null
        references public.restaurants(id) on delete cascade,

    table_number integer not null,
    name text,

    capacity integer not null default 4
        check (capacity > 0 and capacity <= 100),

    location text,

    status text not null default 'available'
        check (
            status in (
                'available',
                'occupied',
                'reserved',
                'billing',
                'disabled'
            )
        ),

    qr_token uuid not null default gen_random_uuid(),

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (restaurant_id, table_number),
    unique (qr_token),
    unique (id, restaurant_id)
);

create index idx_restaurant_tables_restaurant
    on public.restaurant_tables(restaurant_id);

create index idx_restaurant_tables_status
    on public.restaurant_tables(restaurant_id, status);

alter table public.restaurant_tables enable row level security;

create policy "Members view restaurant tables"
on public.restaurant_tables
for select to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = restaurant_tables.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

create policy "Managers insert restaurant tables"
on public.restaurant_tables
for insert to authenticated
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = restaurant_tables.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
);

create policy "Managers update restaurant tables"
on public.restaurant_tables
for update to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = restaurant_tables.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
)
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = restaurant_tables.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
);

create policy "Managers delete restaurant tables"
on public.restaurant_tables
for delete to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = restaurant_tables.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
);

revoke all on public.restaurant_tables
from anon, authenticated;

grant select, insert, update, delete
on public.restaurant_tables
to authenticated;

-- Connect orders to actual tables.
-- table_label remains available for historical display.

alter table public.orders
add column table_id uuid;

alter table public.orders
add constraint orders_table_restaurant_fk
foreign key (table_id, restaurant_id)
references public.restaurant_tables(id, restaurant_id)
on delete restrict;

create index idx_orders_table
on public.orders(table_id);

commit;
