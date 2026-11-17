
begin;

create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  requested_by uuid not null,
  report_type text not null
    check (report_type in (
      'sales',
      'orders',
      'products',
      'inventory',
      'staff',
      'customers',
      'reservations'
    )),
  file_format text not null
    check (file_format in ('pdf', 'xlsx', 'csv')),
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  storage_path text,
  error_message text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_report_exports_restaurant
  on public.report_exports(restaurant_id, requested_at desc);

create index if not exists idx_report_exports_status
  on public.report_exports(status, requested_at);

create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  report_type text not null,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null default '{}'::jsonb,
  generated_by uuid,
  generated_at timestamptz not null default now(),

  constraint report_snapshots_period_check
    check (period_end >= period_start)
);

create index if not exists idx_report_snapshots_period
  on public.report_snapshots(restaurant_id, report_type, period_start, period_end);

alter table public.report_exports enable row level security;
alter table public.report_snapshots enable row level security;

create policy "report_exports_select_admin_manager"
on public.report_exports
for select to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = report_exports.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
);

create policy "report_snapshots_select_admin_manager"
on public.report_snapshots
for select to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = report_snapshots.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
);

grant select on public.report_exports, public.report_snapshots
to authenticated;

commit;
