
-- ============================================================
-- APP-MULTI-RESTO
-- MIGRATION 010: KITCHEN AND PREPARATION
-- ============================================================

begin;

create table public.preparation_tickets (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null
        references public.restaurants(id) on delete restrict,

    order_id uuid not null,
    order_item_id uuid not null,

    preparation_area text not null
        check (preparation_area in ('kitchen', 'bar')),

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'accepted',
                'preparing',
                'ready',
                'delivered',
                'cancelled'
            )
        ),

    priority integer not null default 0,

    assigned_to uuid
        references public.profiles(id) on delete set null,

    started_at timestamptz,
    ready_at timestamptz,
    delivered_at timestamptz,

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint tickets_order_fk
        foreign key (order_id, restaurant_id)
        references public.orders(id, restaurant_id)
        on delete restrict,

    constraint tickets_item_fk
        foreign key (order_item_id)
        references public.order_items(id)
        on delete restrict,

    constraint tickets_item_unique
        unique (order_item_id)
);

create index idx_tickets_restaurant_area_status
    on public.preparation_tickets(
        restaurant_id,
        preparation_area,
        status,
        created_at
    );

create index idx_tickets_order
    on public.preparation_tickets(order_id);

create index idx_tickets_assigned
    on public.preparation_tickets(assigned_to);

alter table public.preparation_tickets enable row level security;

create policy "Members view preparation tickets"
on public.preparation_tickets
for select to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = preparation_tickets.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

create policy "Authorized staff update preparation tickets"
on public.preparation_tickets
for update to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = preparation_tickets.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and (
              rm.role in ('admin', 'manager')
              or (
                  rm.role = 'kitchen'
                  and preparation_tickets.preparation_area = 'kitchen'
              )
              or (
                  rm.role = 'bar'
                  and preparation_tickets.preparation_area = 'bar'
              )
          )
    )
)
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = preparation_tickets.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and (
              rm.role in ('admin', 'manager')
              or (
                  rm.role = 'kitchen'
                  and preparation_tickets.preparation_area = 'kitchen'
              )
              or (
                  rm.role = 'bar'
                  and preparation_tickets.preparation_area = 'bar'
              )
          )
    )
);

revoke all on public.preparation_tickets
from anon, authenticated;

grant select, update
on public.preparation_tickets
to authenticated;

commit;
