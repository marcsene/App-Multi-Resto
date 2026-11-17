
-- ============================================================
-- APP-MULTI-RESTO
-- MIGRATION 002: SECURE ORDERS MODULE
-- PostgreSQL / Supabase
-- ============================================================

begin;

-- ============================================================
-- 1. ORDERS
-- ============================================================

create sequence public.order_number_seq
    start with 1
    increment by 1;

create table public.orders (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null
        references public.restaurants(id) on delete restrict,

    order_number bigint not null
        default nextval('public.order_number_seq'),

    created_by uuid not null
        references public.profiles(id) on delete restrict,

    customer_name text,
    customer_phone text,
    table_label text,

    source text not null default 'staff'
        check (source in ('staff', 'qr', 'online')),

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'confirmed',
                'preparing',
                'ready',
                'delivered',
                'cancelled'
            )
        ),

    currency text not null,

    subtotal numeric(12,2) not null default 0
        check (subtotal >= 0),

    discount numeric(12,2) not null default 0
        check (discount >= 0),

    tax numeric(12,2) not null default 0
        check (tax >= 0),

    total numeric(12,2) not null default 0
        check (total >= 0),

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint orders_restaurant_number_unique
        unique (restaurant_id, order_number),

    constraint orders_id_restaurant_unique
        unique (id, restaurant_id),

    constraint orders_currency_format
        check (currency ~ '^[A-Z]{3}$'),

    constraint orders_customer_name_length
        check (
            customer_name is null
            or length(customer_name) <= 150
        ),

    constraint orders_notes_length
        check (
            notes is null
            or length(notes) <= 2000
        )
);


-- ============================================================
-- 2. ORDER ITEMS
-- ============================================================

create table public.order_items (
    id uuid primary key default gen_random_uuid(),

    order_id uuid not null,

    restaurant_id uuid not null
        references public.restaurants(id) on delete restrict,

    product_id uuid,

    product_name text not null,

    preparation_area text not null
        check (
            preparation_area in ('kitchen', 'bar')
        ),

    quantity integer not null
        check (quantity > 0 and quantity <= 1000),

    unit_price numeric(12,2) not null
        check (unit_price >= 0),

    line_total numeric(14,2)
        generated always as (
            quantity * unit_price
        ) stored,

    item_status text not null default 'pending'
        check (
            item_status in (
                'pending',
                'preparing',
                'ready',
                'cancelled'
            )
        ),

    notes text,

    created_at timestamptz not null default now(),

    constraint order_items_order_restaurant_fk
        foreign key (order_id, restaurant_id)
        references public.orders(id, restaurant_id)
        on delete cascade,

    constraint order_items_product_name_length
        check (length(trim(product_name)) > 0),

    constraint order_items_notes_length
        check (
            notes is null
            or length(notes) <= 1000
        )
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

create index idx_orders_restaurant_created
    on public.orders(restaurant_id, created_at desc);

create index idx_orders_restaurant_status
    on public.orders(restaurant_id, status);

create index idx_order_items_order
    on public.order_items(order_id, restaurant_id);

create index idx_order_items_area_status
    on public.order_items(
        restaurant_id,
        preparation_area,
        item_status
    );


-- ============================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================

create trigger orders_updated_at
before update on public.orders
for each row
execute function private.set_updated_at();


-- ============================================================
-- 5. ENABLE RLS
-- ============================================================

alter table public.orders enable row level security;
alter table public.order_items enable row level security;


-- ============================================================
-- 6. SELECT POLICIES
-- ============================================================

create policy "Members can view restaurant orders"
on public.orders
for select
to authenticated
using (
    private.is_restaurant_member(restaurant_id)
);

create policy "Members can view restaurant order items"
on public.order_items
for select
to authenticated
using (
    private.is_restaurant_member(restaurant_id)
);


-- ============================================================
-- 7. TABLE PRIVILEGES
-- Direct writes are disabled.
-- Writes must use the controlled RPC functions below.
-- ============================================================

revoke all on public.orders
from anon, authenticated;

revoke all on public.order_items
from anon, authenticated;

grant select on public.orders
to authenticated;

grant select on public.order_items
to authenticated;

revoke all on sequence public.order_number_seq
from anon, authenticated;


-- ============================================================
-- 8. CREATE ORDER FUNCTION
-- Creates the order and all its items atomically.
-- Totals are calculated by PostgreSQL.
-- ============================================================

create or replace function public.create_restaurant_order(
    p_restaurant_id uuid,
    p_items jsonb,
    p_customer_name text default null,
    p_customer_phone text default null,
    p_table_label text default null,
    p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_currency text;
    v_order_id uuid;
    v_total numeric(12,2) := 0;
    v_item jsonb;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if p_items is null
       or jsonb_typeof(p_items) <> 'array'
       or jsonb_array_length(p_items) = 0
       or jsonb_array_length(p_items) > 100 then
        raise exception 'Invalid order items';
    end if;

    if exists (
        select 1
        from jsonb_array_elements(p_items) as item(value)
        where jsonb_typeof(item.value) <> 'object'
           or jsonb_typeof(item.value -> 'product_name') <> 'string'
           or nullif(trim(item.value ->> 'product_name'), '') is null
           or length(item.value ->> 'product_name') > 200
           or jsonb_typeof(item.value -> 'preparation_area') <> 'string'
           or item.value ->> 'preparation_area'
                not in ('kitchen', 'bar')
           or coalesce(item.value ->> 'quantity', '') !~ '^[0-9]+$'
           or (item.value ->> 'quantity')::integer not between 1 and 1000
           or coalesce(item.value ->> 'unit_price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
           or (item.value ->> 'unit_price')::numeric > 9999999999.99
           or coalesce(item.value ->> 'unit_price', '')::numeric < 0
    ) then
        raise exception 'Invalid order item data';
    end if;

    if exists (
        select 1
        from public.restaurant_members rm
        where rm.restaurant_id = p_restaurant_id
          and rm.user_id = v_user_id
          and rm.status = 'active'
          and rm.role in ('admin', 'manager', 'waiter')
    ) is not true then
        raise exception 'Not authorized to create orders';
    end if;

    select r.currency
    into v_currency
    from public.restaurants r
    where r.id = p_restaurant_id;

    if v_currency is null then
        raise exception 'Restaurant not found';
    end if;

    insert into public.orders (
        restaurant_id,
        created_by,
        customer_name,
        customer_phone,
        table_label,
        currency,
        notes
    )
    values (
        p_restaurant_id,
        v_user_id,
        nullif(trim(p_customer_name), ''),
        nullif(trim(p_customer_phone), ''),
        nullif(trim(p_table_label), ''),
        v_currency,
        nullif(trim(p_notes), '')
    )
    returning id into v_order_id;

    insert into public.order_items (
        order_id,
        restaurant_id,
        product_name,
        preparation_area,
        quantity,
        unit_price,
        notes
    )
    select
        v_order_id,
        p_restaurant_id,
        item.value ->> 'product_name',
        item.value ->> 'preparation_area',
        (item.value ->> 'quantity')::integer,
        (item.value ->> 'unit_price')::numeric,
        nullif(trim(item.value ->> 'notes'), '')
    from jsonb_array_elements(p_items) as item(value);

    select coalesce(sum(oi.line_total), 0)
    into v_total
    from public.order_items oi
    where oi.order_id = v_order_id;

    update public.orders
    set subtotal = v_total,
        total = v_total
    where id = v_order_id;

    return v_order_id;
end;
$$;


-- ============================================================
-- 9. UPDATE ORDER STATUS
-- Front-of-house status transitions.
-- ============================================================

create or replace function public.update_restaurant_order_status(
    p_order_id uuid,
    p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_restaurant_id uuid;
    v_current_status text;
    v_role text;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if p_status not in (
        'confirmed',
        'preparing',
        'ready',
        'delivered',
        'cancelled'
    ) then
        raise exception 'Invalid order status';
    end if;

    select o.restaurant_id, o.status
    into v_restaurant_id, v_current_status
    from public.orders o
    where o.id = p_order_id
    for update;

    if v_restaurant_id is null then
        raise exception 'Order not found';
    end if;

    select rm.role
    into v_role
    from public.restaurant_members rm
    where rm.restaurant_id = v_restaurant_id
      and rm.user_id = v_user_id
      and rm.status = 'active';

    if v_role is null or v_role not in (
        'admin',
        'manager',
        'waiter'
    ) then
        raise exception 'Not authorized';
    end if;

    if not (
        (v_current_status = 'pending'
            and p_status in ('confirmed', 'cancelled'))
        or
        (v_current_status = 'confirmed'
            and p_status in ('preparing', 'cancelled'))
        or
        (v_current_status = 'preparing'
            and p_status in ('ready', 'cancelled'))
        or
        (v_current_status = 'ready'
            and p_status = 'delivered')
    ) then
        raise exception 'Invalid status transition';
    end if;

    update public.orders
    set status = p_status
    where id = p_order_id;

    return true;
end;
$$;


-- ============================================================
-- 10. UPDATE ORDER ITEM STATUS
-- Kitchen and bar can update only their own area.
-- ============================================================

create or replace function public.update_order_item_status(
    p_item_id uuid,
    p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_restaurant_id uuid;
    v_area text;
    v_current_status text;
    v_role text;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if p_status not in ('preparing', 'ready', 'cancelled') then
        raise exception 'Invalid item status';
    end if;

    select oi.restaurant_id, oi.preparation_area, oi.item_status
    into v_restaurant_id, v_area, v_current_status
    from public.order_items oi
    where oi.id = p_item_id
    for update;

    if v_restaurant_id is null then
        raise exception 'Order item not found';
    end if;

    select rm.role
    into v_role
    from public.restaurant_members rm
    where rm.restaurant_id = v_restaurant_id
      and rm.user_id = v_user_id
      and rm.status = 'active';

    if v_role is null then
        raise exception 'Not authorized';
    end if;

    if v_role = 'kitchen' and v_area <> 'kitchen' then
        raise exception 'Kitchen cannot update bar items';
    end if;

    if v_role = 'bar' and v_area <> 'bar' then
        raise exception 'Bar cannot update kitchen items';
    end if;

    if v_role not in (
        'admin',
        'manager',
        'kitchen',
        'bar'
    ) then
        raise exception 'Not authorized';
    end if;

    if not (
        (v_current_status = 'pending'
            and p_status in ('preparing', 'cancelled'))
        or
        (v_current_status = 'preparing'
            and p_status in ('ready', 'cancelled'))
    ) then
        raise exception 'Invalid item status transition';
    end if;

    update public.order_items
    set item_status = p_status
    where id = p_item_id;

    return true;
end;
$$;


-- ============================================================
-- 11. FUNCTION PERMISSIONS
-- ============================================================

revoke all on function public.create_restaurant_order(
    uuid, jsonb, text, text, text, text
) from public;

revoke all on function public.update_restaurant_order_status(
    uuid, text
) from public;

revoke all on function public.update_order_item_status(
    uuid, text
) from public;

grant execute on function public.create_restaurant_order(
    uuid, jsonb, text, text, text, text
) to authenticated;

grant execute on function public.update_restaurant_order_status(
    uuid, text
) to authenticated;

grant execute on function public.update_order_item_status(
    uuid, text
) to authenticated;


commit;

-- ============================================================
-- END MIGRATION 002
-- ============================================================
