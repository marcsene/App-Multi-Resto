
-- ============================================
-- APP MULTI RESTO
-- MIGRATION 001: CORE DATABASE
-- ============================================

-- 1. EXTENSIONES
create extension if not exists pgcrypto;

-- 2. PERFILES DE USUARIO
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    avatar_url text,
    platform_role text not null default 'user'
        check (platform_role in ('user', 'superadmin')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. RESTAURANTES
create table public.restaurants (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    legal_name text,
    tax_id text,
    email text,
    phone text,
    address text,
    country text not null default 'CL',
    currency text not null default 'CLP',
    timezone text not null default 'America/Santiago',
    status text not null default 'pending'
        check (status in ('pending', 'active', 'suspended', 'cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 4. MIEMBROS DE RESTAURANTES
create table public.restaurant_members (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null
        references public.restaurants(id) on delete cascade,

    user_id uuid not null
        references public.profiles(id) on delete cascade,

    role text not null
        check (
            role in (
                'admin',
                'manager',
                'waiter',
                'kitchen',
                'bar',
                'cashier'
            )
        ),

    status text not null default 'active'
        check (status in ('active', 'invited', 'suspended')),

    created_at timestamptz not null default now(),

    unique (restaurant_id, user_id)
);

-- 5. ÍNDICES
create index idx_restaurants_status
    on public.restaurants(status);

create index idx_restaurant_members_user
    on public.restaurant_members(user_id);

create index idx_restaurant_members_restaurant
    on public.restaurant_members(restaurant_id);

create index idx_restaurant_members_role
    on public.restaurant_members(restaurant_id, role);
