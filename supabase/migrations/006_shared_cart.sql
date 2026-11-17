
-- ============================================================
-- APP-MULTI-RESTO
-- MIGRATION 006: SHARED CART
-- ============================================================

begin;

create table public.carts (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null,
    session_id uuid not null,

    status text not null default 'active'
        check (status in ('active', 'submitted', 'cancelled')),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint carts_session_fk
        foreign key (session_id, restaurant_id)
        references public.table_sessions(id, restaurant_id)
        on delete restrict,

    constraint carts_id_restaurant_unique
        unique (id, restaurant_id),

    unique (session_id)
);

create table public.cart_items (
    id uuid primary key default gen_random_uuid(),

    cart_id uuid not null,
    restaurant_id uuid not null,
    product_id uuid not null,

    participant_id uuid,

    product_name text not null,
    unit_price numeric(12,2) not null check (unit_price >= 0),

    quantity integer not null default 1
        check (quantity between 1 and 1000),

    preparation_area text not null
        check (preparation_area in ('kitchen', 'bar')),

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint cart_items_cart_fk
        foreign key (cart_id, restaurant_id)
        references public.carts(id, restaurant_id)
        on delete cascade,

    constraint cart_items_product_fk
        foreign key (product_id, restaurant_id)
        references public.products(id, restaurant_id)
        on delete restrict,

    constraint cart_items_participant_fk
        foreign key (participant_id)
        references public.session_participants(id)
        on delete set null
);

create index idx_carts_session
    on public.carts(session_id);

create index idx_cart_items_cart
    on public.cart_items(cart_id);

create index idx_cart_items_product
    on public.cart_items(product_id);

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

create policy "Staff view restaurant carts"
on public.carts
for select to authenticated
using (
    exists (
        select 1
        from public.restaurant_members rm
        where rm.restaurant_id = carts.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

create policy "Staff view cart items"
on public.cart_items
for select to authenticated
using (
    exists (
        select 1
        from public.restaurant_members rm
        where rm.restaurant_id = cart_items.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

revoke all on public.carts, public.cart_items
from anon, authenticated;

grant select on public.carts, public.cart_items
to authenticated;

commit;
