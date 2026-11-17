
begin;

create table if not exists public.restaurant_settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique
    references public.restaurants(id) on delete cascade,

  default_language text not null default 'es'
    check (default_language in ('es', 'en', 'fr', 'pt', 'it')),

  enabled_languages text[] not null
    default array['es', 'en', 'fr', 'pt', 'it']::text[],

  timezone text not null default 'America/Santiago',

  allow_customer_ordering boolean not null default true,
  allow_shared_cart boolean not null default true,
  require_session_pin boolean not null default true,
  require_responsible_confirmation boolean not null default true,

  enable_reservations boolean not null default true,
  enable_inventory boolean not null default true,
  enable_customer_notifications boolean not null default true,

  service_charge_percentage numeric(5,2) not null default 0,
  tax_percentage numeric(5,2) not null default 0,

  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint restaurant_settings_service_charge_check
    check (service_charge_percentage between 0 and 100),

  constraint restaurant_settings_tax_check
    check (tax_percentage between 0 and 100),

  constraint restaurant_settings_languages_check
    check (
      cardinality(enabled_languages) > 0
      and enabled_languages <@
        array['es', 'en', 'fr', 'pt', 'it']::text[]
      and default_language = any(enabled_languages)
    )
);

create table if not exists public.restaurant_localizations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null
    references public.restaurants(id) on delete cascade,

  language_code text not null
    check (language_code in ('es', 'en', 'fr', 'pt', 'it')),

  restaurant_name text,
  description text,
  address text,
  welcome_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (restaurant_id, language_code)
);

alter table public.restaurant_settings enable row level security;
alter table public.restaurant_localizations enable row level security;

create policy "restaurant_settings_select_members"
on public.restaurant_settings
for select to authenticated
using (private.is_restaurant_member(restaurant_id));

create policy "restaurant_settings_manage_admin_manager"
on public.restaurant_settings
for all to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = restaurant_settings.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = restaurant_settings.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
);

create policy "restaurant_localizations_select_members"
on public.restaurant_localizations
for select to authenticated
using (private.is_restaurant_member(restaurant_id));

create policy "restaurant_localizations_manage_admin_manager"
on public.restaurant_localizations
for all to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = restaurant_localizations.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = restaurant_localizations.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
);

grant select, insert, update, delete
on public.restaurant_settings, public.restaurant_localizations
to authenticated;

commit;
