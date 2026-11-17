
-- ============================================================
-- APP-MULTI-RESTO
-- MIGRATION 005: CUSTOMER SESSIONS AND PARTICIPANTS
-- ============================================================

begin;

create table public.table_sessions (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null
        references public.restaurants(id) on delete restrict,

    table_id uuid not null,

    responsible_name text,
    responsible_phone text,

    pin_hash text not null,

    status text not null default 'open'
        check (
            status in (
                'open',
                'billing',
                'closed',
                'expired'
            )
        ),

    opened_at timestamptz not null default now(),
    closed_at timestamptz,

    expires_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint sessions_table_restaurant_fk
        foreign key (table_id, restaurant_id)
        references public.restaurant_tables(id, restaurant_id)
        on delete restrict,

    constraint sessions_id_restaurant_unique
        unique (id, restaurant_id)
);

-- Only one open or billing session per table.

create unique index idx_one_open_session_per_table
on public.table_sessions(table_id)
where status in ('open', 'billing');

create index idx_sessions_restaurant_status
on public.table_sessions(restaurant_id, status);

create index idx_sessions_table
on public.table_sessions(table_id);

-- Participants connected to a table session.

create table public.session_participants (
    id uuid primary key default gen_random_uuid(),

    session_id uuid not null
        references public.table_sessions(id) on delete cascade,

    participant_token_hash text not null,

    display_name text,

    is_responsible boolean not null default false,

    joined_at timestamptz not null default now(),
    last_seen_at timestamptz,

    unique (session_id, participant_token_hash)
);

create index idx_session_participants_session
on public.session_participants(session_id);

-- RLS: no direct customer access.
-- Customer operations will be performed through
-- validated server-side endpoints or Edge Functions.

alter table public.table_sessions enable row level security;
alter table public.session_participants enable row level security;

create policy "Staff view restaurant sessions"
on public.table_sessions
for select to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = table_sessions.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

create policy "Staff update restaurant sessions"
on public.table_sessions
for update to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = table_sessions.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager', 'waiter', 'cashier')
    )
)
with check (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = table_sessions.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
          and rm.role in ('admin', 'manager', 'waiter', 'cashier')
    )
);

create policy "Staff view session participants"
on public.session_participants
for select to authenticated
using (
    exists (
        select 1
        from public.table_sessions s
        join public.restaurant_members rm
          on rm.restaurant_id = s.restaurant_id
        where s.id = session_participants.session_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

revoke all on public.table_sessions,
    public.session_participants
from anon, authenticated;

grant select, update
on public.table_sessions
to authenticated;

grant select
on public.session_participants
to authenticated;

commit;
