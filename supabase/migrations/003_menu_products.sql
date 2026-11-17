
-- ============================================================
-- APP-MULTI-RESTO
-- MIGRATION 003: MENU, CATEGORIES AND PRODUCTS
-- ============================================================

begin;

-- 1. CATEGORIES

create table public.categories (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null
        references public.restaurants(id) on delete cascade,

    name text not null,
    description text,
    image_url text,

    sort_order integer not null default 0,
    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint categories_name_length
        check (length(trim(name)) between 1 and 100),

    constraint categories_restaurant_name_unique
        unique (restaurant_id, name),

    constraint categories_id_restaurant_unique
        unique (id, restaurant_id)
);

-- 2. PRODUCTS

create table public.products (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null
        references public.restaurants(id) on delete cascade,

    category_id uuid not null,

    name text not null,
    description text,
    image_url text,

    price numeric(12,2) not null
        check (price >= 0),

    preparation_area text not null default 'kitchen'
        check (preparation_area in ('kitchen', 'bar')),

    is_available boolean not null default true,
    is_active boolean not null default true,

    sort_order integer not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint products_name_length
        check (length(trim(name)) between 1 and 150),

    constraint products_category_restaurant_fk
        foreign key (category_id, restaurant_id)
        references public.categories(id, restaurant_id)
        on delete restrict,

    constraint products_id_restaurant_unique
        unique (id, restaurant_id)
);

-- 3. PRODUCT TRANSLATIONS

create table public.product_translations (
    id uuid primary key default gen_random_uuid(),

    product_id uuid not null
        references public.products(id) on delete cascade,

    language_code varchar(5) not null,
    name text not null,
    description text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (product_id, language_code),

    check (length(trim(name)) between 1 and 150)
);

-- 4. CATEGORY TRANSLATIONS

create table public.category_translations (
    id uuid primary key default gen_random_uuid(),

    category_id uuid not null
        references public.categories(id) on delete cascade,

    language_code varchar(5) not null,
    name text not null,
    description text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (category_id, language_code),

    check (length(trim(name)) between 1 and 100)
);

-- 5. INDEXES

create index idx_categories_restaurant
    on public.categories(restaurant_id, sort_order);

create index idx_products_restaurant
    on public.products(restaurant_id);

create index idx_products_category
    on public.products(category_id);

create index idx_products_available
    on public.products(restaurant_id, is_available, is_active);

create index idx_products_area
    on public.products(restaurant_id, preparation_area);

-- 6. RLS

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_translations enable row level security;
alter table public.category_translations enable row level security;

-- Categories

create policy "Members view categories"
on public.categories
for select to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = categories.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

create policy "Managers insert categories"
on public.categories
for insert to authenticated
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = categories.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
);

create policy "Managers update categories"
on public.categories
for update to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = categories.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
)
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = categories.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
);

create policy "Managers delete categories"
on public.categories
for delete to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = categories.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
);

-- Products

create policy "Members view products"
on public.products
for select to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = products.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

create policy "Managers insert products"
on public.products
for insert to authenticated
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = products.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
);

create policy "Managers update products"
on public.products
for update to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = products.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
)
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = products.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
);

create policy "Managers delete products"
on public.products
for delete to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = products.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
);

-- Translation access follows the parent record's restaurant.

create policy "Members view product translations"
on public.product_translations
for select to authenticated
using (
    exists (
        select 1
        from public.products p
        join public.restaurant_members rm
          on rm.restaurant_id = p.restaurant_id
        where p.id = product_translations.product_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

create policy "Managers manage product translations"
on public.product_translations
for all to authenticated
using (
    exists (
        select 1
        from public.products p
        join public.restaurant_members rm
          on rm.restaurant_id = p.restaurant_id
        where p.id = product_translations.product_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
)
with check (
    exists (
        select 1
        from public.products p
        join public.restaurant_members rm
          on rm.restaurant_id = p.restaurant_id
        where p.id = product_translations.product_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
);

create policy "Members view category translations"
on public.category_translations
for select to authenticated
using (
    exists (
        select 1
        from public.categories c
        join public.restaurant_members rm
          on rm.restaurant_id = c.restaurant_id
        where c.id = category_translations.category_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

create policy "Managers manage category translations"
on public.category_translations
for all to authenticated
using (
    exists (
        select 1
        from public.categories c
        join public.restaurant_members rm
          on rm.restaurant_id = c.restaurant_id
        where c.id = category_translations.category_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
)
with check (
    exists (
        select 1
        from public.categories c
        join public.restaurant_members rm
          on rm.restaurant_id = c.restaurant_id
        where c.id = category_translations.category_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager')
    )
);

-- 7. PRIVILEGES

revoke all on public.categories,
    public.products,
    public.product_translations,
    public.category_translations
from anon, authenticated;

grant select, insert, update, delete
on public.categories, public.products,
   public.product_translations, public.category_translations
to authenticated;

-- 8. PRODUCT REFERENCE IN ORDER ITEMS
-- RESTRICT preserves historical order references.

alter table public.order_items
add constraint order_items_product_restaurant_fk
foreign key (product_id, restaurant_id)
references public.products(id, restaurant_id)
on delete restrict;

commit;
