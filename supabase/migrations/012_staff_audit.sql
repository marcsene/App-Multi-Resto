
begin;

create table if not exists public.restaurant_invitations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  email text not null,
  role text not null
    check (role in (
      'admin',
      'manager',
      'waiter',
      'kitchen',
      'bar',
      'cashier'
    )),
  token_hash text not null unique,
  invited_by uuid,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_restaurant_invitations_restaurant
  on public.restaurant_invitations(restaurant_id, status);

create table if not exists public.restaurant_staff_profiles (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  user_id uuid not null,
  display_name text,
  phone text,
  position text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (restaurant_id, user_id)
    references public.restaurant_members(restaurant_id, user_id)
    on delete cascade,

  unique (restaurant_id, user_id),
  unique (id, restaurant_id)
);

create table if not exists public.restaurant_audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists idx_restaurant_audit_logs_restaurant
  on public.restaurant_audit_logs(restaurant_id, created_at desc);

create index if not exists idx_restaurant_audit_logs_user
  on public.restaurant_audit_logs(restaurant_id, user_id);

alter table public.restaurant_invitations enable row level security;
alter table public.restaurant_staff_profiles enable row level security;
alter table public.restaurant_audit_logs enable row level security;

create policy "invitations_select_admin_manager"
on public.restaurant_invitations
for select to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = restaurant_invitations.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
);

create policy "staff_profiles_select_members"
on public.restaurant_staff_profiles
for select to authenticated
using (private.is_restaurant_member(restaurant_id));

create policy "staff_profiles_manage_admin_manager"
on public.restaurant_staff_profiles
for all to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = restaurant_staff_profiles.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = restaurant_staff_profiles.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
);

create policy "audit_logs_select_admin_manager"
on public.restaurant_audit_logs
for select to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = restaurant_audit_logs.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
);

grant select on public.restaurant_invitations to authenticated;
grant select, insert, update, delete
on public.restaurant_staff_profiles to authenticated;
grant select on public.restaurant_audit_logs to authenticated;

commit;
