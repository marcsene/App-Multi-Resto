
-- ============================================================
-- APP-MULTI-RESTO
-- MIGRATION 009: CUSTOMERS
-- ============================================================

begin;

create table public.customers (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null
        references public.restaurants(id) on delete restrict,

    full_name text not null,
    phone text,
    email text,

    birth_date date,

    notes text,

    marketing_consent boolean not null default false,

    visits_count integer not null default 0
        check (visits_count >= 0),

    total_spent numeric(14,2) not null default 0
        check (total_spent >= 0),

    last_visit_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint customers_name_length
        check (length(trim(full_name)) between 1 and 150),

    constraint customers_id_restaurant_unique
        unique (id, restaurant_id)
);

create unique index idx_customers_restaurant_phone
on public.customers(restaurant_id, phone)
where phone is not null;

create index idx_customers_restaurant_name
on public.customers(restaurant_id, full_name);

create index idx_customers_restaurant_last_visit
on public.customers(restaurant_id, last_visit_at desc);

alter table public.customers enable row level security;

create policy "Members view customers"
on public.customers
for select to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = customers.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

create policy "Staff create customers"
on public.customers
for insert to authenticated
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = customers.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager', 'waiter')
    )
);

create policy "Managers update customers"
on public.customers
for update to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = customers.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager', 'waiter')
    )
)
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = customers.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager', 'waiter')
    )
);

revoke all on public.customers
from anon, authenticated;

grant select, insert, update
on public.customers
to authenticated;

commit;
