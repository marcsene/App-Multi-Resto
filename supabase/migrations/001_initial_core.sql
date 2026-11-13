
-- ============================================================
-- APP-MULTI-RESTO
-- MIGRATION 001: CORE + MULTI-TENANT + SUBSCRIPTIONS
-- PostgreSQL / Supabase
-- ============================================================

begin;

-- ============================================================
-- 1. EXTENSIONS AND PRIVATE SCHEMA
-- ============================================================

create extension if not exists pgcrypto;

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;


-- ============================================================
-- 2. PROFILES
-- ============================================================

create table public.profiles (
    id uuid primary key
        references auth.users(id) on delete cascade,

    full_name text,
    avatar_url text,

    platform_role text not null default 'user'
        check (platform_role in ('user', 'superadmin')),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- 3. RESTAURANTS
-- ============================================================

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
        check (
            status in (
                'pending',
                'active',
                'suspended',
                'cancelled'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint restaurants_name_not_empty
        check (length(trim(name)) > 0),

    constraint restaurants_slug_format
        check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);


-- ============================================================
-- 4. RESTAURANT MEMBERS
-- ============================================================

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
        check (
            status in ('active', 'invited', 'suspended')
        ),

    created_at timestamptz not null default now(),

    unique (restaurant_id, user_id)
);


-- ============================================================
-- 5. SAAS SUBSCRIPTIONS
-- ============================================================

create table public.subscriptions (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null unique
        references public.restaurants(id) on delete cascade,

    plan text not null default 'trial'
        check (plan in ('trial', 'monthly', 'annual')),

    status text not null default 'trialing'
        check (
            status in (
                'trialing',
                'active',
                'past_due',
                'grace_period',
                'suspended',
                'cancelled'
            )
        ),

    trial_started_at timestamptz,
    trial_ends_at timestamptz,

    current_period_start timestamptz,
    current_period_end timestamptz,

    grace_period_ends_at timestamptz,

    cancelled_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint valid_trial_period
        check (
            trial_ends_at is null
            or trial_started_at is null
            or trial_ends_at > trial_started_at
        )
);


-- ============================================================
-- 6. SAAS SUBSCRIPTION PAYMENTS
-- These are NOT restaurant customer payments.
-- ============================================================

create table public.subscription_payments (
    id uuid primary key default gen_random_uuid(),

    subscription_id uuid not null
        references public.subscriptions(id) on delete restrict,

    provider text not null default 'paypal'
        check (provider in ('paypal')),

    external_payment_id text unique,

    amount numeric(12,2) not null
        check (amount > 0),

    currency text not null default 'CLP',

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'completed',
                'failed',
                'refunded'
            )
        ),

    paid_at timestamptz,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 7. INDEXES
-- ============================================================

create index idx_restaurants_status
    on public.restaurants(status);

create index idx_members_user
    on public.restaurant_members(user_id);

create index idx_members_restaurant
    on public.restaurant_members(restaurant_id);

create index idx_members_role
    on public.restaurant_members(restaurant_id, role);

create index idx_subscriptions_status
    on public.subscriptions(status);

create index idx_subscription_payments_subscription
    on public.subscription_payments(subscription_id);

create index idx_subscription_payments_status
    on public.subscription_payments(status);


-- ============================================================
-- 8. UPDATED_AT TRIGGER
-- ============================================================

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger restaurants_updated_at
before update on public.restaurants
for each row execute function private.set_updated_at();

create trigger subscriptions_updated_at
before update on public.subscriptions
for each row execute function private.set_updated_at();


-- ============================================================
-- 9. AUTOMATIC PROFILE CREATION
-- ============================================================

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (
        id,
        full_name,
        avatar_url
    )
    values (
        new.id,
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
    );

    return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function private.handle_new_user();


-- ============================================================
-- 10. PRIVATE AUTHORIZATION HELPERS
-- ============================================================

create or replace function private.is_restaurant_member(
    p_restaurant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.restaurant_members rm
        where rm.restaurant_id = p_restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    );
$$;


create or replace function private.has_restaurant_role(
    p_restaurant_id uuid,
    p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.restaurant_members rm
        where rm.restaurant_id = p_restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role = any(p_roles)
    );
$$;

revoke all on function private.is_restaurant_member(uuid) from public;
revoke all on function private.has_restaurant_role(uuid, text[]) from public;

grant execute on function private.is_restaurant_member(uuid)
    to authenticated;

grant execute on function private.has_restaurant_role(uuid, text[])
    to authenticated;


-- ============================================================
-- 11. CREATE RESTAURANT + FIRST ADMIN + FREE TRIAL
-- All operations happen in one database transaction.
-- ============================================================

create or replace function public.create_restaurant_with_admin(
    p_name text,
    p_slug text,
    p_country text default 'CL',
    p_currency text default 'CLP',
    p_timezone text default 'America/Santiago'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid;
    v_restaurant_id uuid;
    v_now timestamptz := now();
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    if not exists (
        select 1
        from public.profiles p
        where p.id = v_user_id
    ) then
        raise exception 'User profile not found';
    end if;

    if p_name is null
       or length(trim(p_name)) = 0
       or length(trim(p_name)) > 150 then
        raise exception 'Invalid restaurant name';
    end if;

    if p_slug is null
       or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       or length(p_slug) > 80 then
        raise exception 'Invalid restaurant slug';
    end if;

    if p_country is null
       or length(trim(p_country)) <> 2 then
        raise exception 'Invalid country code';
    end if;

    if p_currency is null
       or length(trim(p_currency)) <> 3 then
        raise exception 'Invalid currency code';
    end if;

    if p_timezone is null
       or length(trim(p_timezone)) = 0 then
        raise exception 'Invalid timezone';
    end if;

    insert into public.restaurants (
        name,
        slug,
        country,
        currency,
        timezone
    )
    values (
        trim(p_name),
        p_slug,
        upper(trim(p_country)),
        upper(trim(p_currency)),
        trim(p_timezone)
    )
    returning id into v_restaurant_id;

    insert into public.restaurant_members (
        restaurant_id,
        user_id,
        role,
        status
    )
    values (
        v_restaurant_id,
        v_user_id,
        'admin',
        'active'
    );

    insert into public.subscriptions (
        restaurant_id,
        plan,
        status,
        trial_started_at,
        trial_ends_at
    )
    values (
        v_restaurant_id,
        'trial',
        'trialing',
        v_now,
        v_now + interval '7 days'
    );

    return v_restaurant_id;
end;
$$;

revoke all on function public.create_restaurant_with_admin(
    text, text, text, text, text
) from public;

grant execute on function public.create_restaurant_with_admin(
    text, text, text, text, text
) to authenticated;


-- ============================================================
-- 12. ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;


-- ============================================================
-- 13. PROFILES POLICIES
-- ============================================================

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));


-- ============================================================
-- 14. RESTAURANTS POLICIES
-- ============================================================

create policy "Members can view their restaurants"
on public.restaurants
for select
to authenticated
using (private.is_restaurant_member(id));

create policy "Admins can update their restaurants"
on public.restaurants
for update
to authenticated
using (
    private.has_restaurant_role(id, array['admin'])
)
with check (
    private.has_restaurant_role(id, array['admin'])
);


-- ============================================================
-- 15. MEMBERSHIP POLICIES
-- ============================================================

create policy "Users and admins can view memberships"
on public.restaurant_members
for select
to authenticated
using (
    user_id = (select auth.uid())
    or private.has_restaurant_role(
        restaurant_id,
        array['admin']
    )
);


-- ============================================================
-- 16. SUBSCRIPTION POLICIES
-- ============================================================

create policy "Admins can view their subscription"
on public.subscriptions
for select
to authenticated
using (
    private.has_restaurant_role(
        restaurant_id,
        array['admin']
    )
);


-- ============================================================
-- 17. SUBSCRIPTION PAYMENT POLICIES
-- ============================================================

create policy "Admins can view subscription payments"
on public.subscription_payments
for select
to authenticated
using (
    exists (
        select 1
        from public.subscriptions s
        where s.id = subscription_id
          and private.has_restaurant_role(
              s.restaurant_id,
              array['admin']
          )
    )
);


-- ============================================================
-- 18. TABLE PRIVILEGES
-- ============================================================

revoke all on public.profiles
    from anon, authenticated;

revoke all on public.restaurants
    from anon, authenticated;

revoke all on public.restaurant_members
    from anon, authenticated;

revoke all on public.subscriptions
    from anon, authenticated;

revoke all on public.subscription_payments
    from anon, authenticated;


grant select on public.profiles to authenticated;

grant update (full_name, avatar_url)
on public.profiles to authenticated;


grant select on public.restaurants to authenticated;

grant update (
    name,
    legal_name,
    tax_id,
    email,
    phone,
    address,
    country,
    currency,
    timezone
)
on public.restaurants to authenticated;


grant select on public.restaurant_members to authenticated;

grant select on public.subscriptions to authenticated;

grant select on public.subscription_payments to authenticated;


-- ============================================================
-- 19. FUNCTION PERMISSIONS
-- ============================================================

revoke all on function private.set_updated_at() from public;

commit;

-- ============================================================
-- END MIGRATION 001
-- ============================================================
