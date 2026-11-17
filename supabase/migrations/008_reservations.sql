
-- ============================================================
-- APP-MULTI-RESTO
-- MIGRATION 008: RESERVATIONS
-- ============================================================

begin;

create table public.reservations (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null
        references public.restaurants(id) on delete restrict,

    table_id uuid,

    customer_name text not null,
    customer_phone text,
    customer_email text,

    reservation_date date not null,
    start_time time not null,
    end_time time not null,

    party_size integer not null
        check (party_size between 1 and 100),

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'confirmed',
                'seated',
                'completed',
                'cancelled',
                'no_show'
            )
        ),

    notes text,

    created_by uuid
        references public.profiles(id) on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint reservations_table_fk
        foreign key (table_id, restaurant_id)
        references public.restaurant_tables(id, restaurant_id)
        on delete restrict,

    constraint reservations_time_check
        check (end_time > start_time),

    constraint reservations_customer_length
        check (length(trim(customer_name)) between 1 and 150)
);

create index idx_reservations_restaurant_date
    on public.reservations(restaurant_id, reservation_date);

create index idx_reservations_table_date
    on public.reservations(table_id, reservation_date);

create index idx_reservations_status
    on public.reservations(restaurant_id, status);

alter table public.reservations enable row level security;

create policy "Members view reservations"
on public.reservations
for select to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = reservations.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

create policy "Staff create reservations"
on public.reservations
for insert to authenticated
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = reservations.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager', 'waiter')
    )
);

create policy "Staff update reservations"
on public.reservations
for update to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = reservations.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager', 'waiter')
    )
)
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = reservations.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager', 'waiter')
    )
);

revoke all on public.reservations
from anon, authenticated;

grant select, insert, update
on public.reservations
to authenticated;

commit;
