
-- ============================================================
-- APP-MULTI-RESTO
-- MIGRATION 007: BILLING AND PAYMENTS
-- ============================================================

begin;

create table public.restaurant_bills (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null
        references public.restaurants(id) on delete restrict,

    order_id uuid not null,

    bill_number bigint generated always as identity,

    status text not null default 'open'
        check (
            status in ('open', 'partially_paid', 'paid', 'cancelled')
        ),

    subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
    discount numeric(12,2) not null default 0 check (discount >= 0),
    tax numeric(12,2) not null default 0 check (tax >= 0),
    tip numeric(12,2) not null default 0 check (tip >= 0),
    total numeric(12,2) not null default 0 check (total >= 0),

    currency text not null,

    opened_at timestamptz not null default now(),
    paid_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint bills_order_fk
        foreign key (order_id, restaurant_id)
        references public.orders(id, restaurant_id)
        on delete restrict,

    constraint bills_order_unique unique (order_id),
    constraint bills_currency_format check (currency ~ '^[A-Z]{3}$')
);

create table public.payment_transactions (
    id uuid primary key default gen_random_uuid(),

    restaurant_id uuid not null,
    bill_id uuid not null,

    amount numeric(12,2) not null check (amount > 0),

    payment_method text not null
        check (
            payment_method in (
                'cash',
                'card',
                'transfer',
                'online',
                'other'
            )
        ),

    status text not null default 'completed'
        check (
            status in ('pending', 'completed', 'failed', 'refunded')
        ),

    reference text,
    notes text,

    processed_by uuid
        references public.profiles(id) on delete set null,

    created_at timestamptz not null default now(),

    constraint payments_bill_fk
        foreign key (bill_id)
        references public.restaurant_bills(id)
        on delete restrict
);

create index idx_bills_restaurant_status
    on public.restaurant_bills(restaurant_id, status);

create index idx_bills_order
    on public.restaurant_bills(order_id);

create index idx_payments_bill
    on public.payment_transactions(bill_id);

create index idx_payments_restaurant_date
    on public.payment_transactions(restaurant_id, created_at desc);

alter table public.restaurant_bills enable row level security;
alter table public.payment_transactions enable row level security;

create policy "Members view restaurant bills"
on public.restaurant_bills
for select to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = restaurant_bills.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

create policy "Members view restaurant payments"
on public.payment_transactions
for select to authenticated
using (
    exists (
        select 1 from public.restaurant_members rm
        where rm.restaurant_id = payment_transactions.restaurant_id
          and rm.user_id = (select auth.uid())
          and rm.status = 'active'
    )
);

revoke all on public.restaurant_bills,
    public.payment_transactions
from anon, authenticated;

grant select on public.restaurant_bills,
    public.payment_transactions
to authenticated;

commit;
