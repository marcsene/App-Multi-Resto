
begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  recipient_user_id uuid not null,
  notification_type text not null
    check (notification_type in (
      'new_order',
      'order_updated',
      'order_ready',
      'table_call',
      'payment_received',
      'reservation_created',
      'reservation_updated',
      'low_stock',
      'system',
      'announcement'
    )),
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),

  constraint notifications_title_check
    check (length(trim(title)) > 0),
  constraint notifications_message_check
    check (length(trim(message)) > 0)
);

create index if not exists idx_notifications_recipient
  on public.notifications(recipient_user_id, is_read, created_at desc);

create index if not exists idx_notifications_restaurant
  on public.notifications(restaurant_id, created_at desc);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null,
  notification_type text not null,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now(),

  unique (restaurant_id, user_id, notification_type)
);

create index if not exists idx_notification_preferences_user
  on public.notification_preferences(restaurant_id, user_id);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

create policy "notifications_select_recipient"
on public.notifications
for select to authenticated
using (
  recipient_user_id = auth.uid()
  and private.is_restaurant_member(restaurant_id)
);

create policy "notifications_update_recipient"
on public.notifications
for update to authenticated
using (
  recipient_user_id = auth.uid()
  and private.is_restaurant_member(restaurant_id)
)
with check (
  recipient_user_id = auth.uid()
  and private.is_restaurant_member(restaurant_id)
);

create policy "notification_preferences_select_own"
on public.notification_preferences
for select to authenticated
using (
  user_id = auth.uid()
  and private.is_restaurant_member(restaurant_id)
);

create policy "notification_preferences_insert_own"
on public.notification_preferences
for insert to authenticated
with check (
  user_id = auth.uid()
  and private.is_restaurant_member(restaurant_id)
);

create policy "notification_preferences_update_own"
on public.notification_preferences
for update to authenticated
using (
  user_id = auth.uid()
  and private.is_restaurant_member(restaurant_id)
)
with check (
  user_id = auth.uid()
  and private.is_restaurant_member(restaurant_id)
);

grant select, update on public.notifications to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

commit;
