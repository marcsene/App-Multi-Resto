
begin;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  unit text not null default 'unit',
  current_stock numeric(12,3) not null default 0,
  minimum_stock numeric(12,3) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint inventory_items_stock_check
    check (current_stock >= 0),
  constraint inventory_items_minimum_check
    check (minimum_stock >= 0),
  constraint inventory_items_cost_check
    check (unit_cost >= 0),
  constraint inventory_items_name_check
    check (length(trim(name)) > 0),

  unique (id, restaurant_id)
);

create index if not exists idx_inventory_items_restaurant
  on public.inventory_items(restaurant_id);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  inventory_item_id uuid not null,
  movement_type text not null
    check (movement_type in (
      'purchase',
      'consumption',
      'adjustment',
      'return',
      'waste'
    )),
  quantity numeric(12,3) not null,
  unit_cost numeric(12,2),
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),

  constraint inventory_movements_quantity_check
    check (quantity > 0),
  constraint inventory_movements_cost_check
    check (unit_cost is null or unit_cost >= 0),

  foreign key (inventory_item_id, restaurant_id)
    references public.inventory_items(id, restaurant_id)
    on delete restrict
);

create index if not exists idx_inventory_movements_item
  on public.inventory_movements(restaurant_id, inventory_item_id, created_at desc);

create table if not exists public.product_recipes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  product_id uuid not null,
  name text,
  created_at timestamptz not null default now(),

  foreign key (product_id, restaurant_id)
    references public.products(id, restaurant_id)
    on delete cascade,

  unique (product_id),
  unique (id, restaurant_id)
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  recipe_id uuid not null,
  inventory_item_id uuid not null,
  quantity numeric(12,3) not null,
  created_at timestamptz not null default now(),

  constraint recipe_ingredients_quantity_check
    check (quantity > 0),

  foreign key (recipe_id, restaurant_id)
    references public.product_recipes(id, restaurant_id)
    on delete cascade,

  foreign key (inventory_item_id, restaurant_id)
    references public.inventory_items(id, restaurant_id)
    on delete restrict,

  unique (recipe_id, inventory_item_id)
);

create index if not exists idx_recipe_ingredients_recipe
  on public.recipe_ingredients(recipe_id);

alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.product_recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

create policy "inventory_items_select_members"
on public.inventory_items
for select to authenticated
using (private.is_restaurant_member(restaurant_id));

create policy "inventory_items_manage_admin_manager"
on public.inventory_items
for all to authenticated
using (
  exists (
    select 1
    from public.restaurant_members rm
    where rm.restaurant_id = inventory_items.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.restaurant_members rm
    where rm.restaurant_id = inventory_items.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
);

create policy "inventory_movements_select_members"
on public.inventory_movements
for select to authenticated
using (private.is_restaurant_member(restaurant_id));

create policy "inventory_movements_insert_managers"
on public.inventory_movements
for insert to authenticated
with check (
  exists (
    select 1
    from public.restaurant_members rm
    where rm.restaurant_id = inventory_movements.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
);

create policy "product_recipes_select_members"
on public.product_recipes
for select to authenticated
using (private.is_restaurant_member(restaurant_id));

create policy "product_recipes_manage_admin_manager"
on public.product_recipes
for all to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = product_recipes.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = product_recipes.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
);

create policy "recipe_ingredients_select_members"
on public.recipe_ingredients
for select to authenticated
using (private.is_restaurant_member(restaurant_id));

create policy "recipe_ingredients_manage_admin_manager"
on public.recipe_ingredients
for all to authenticated
using (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = recipe_ingredients.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1 from public.restaurant_members rm
    where rm.restaurant_id = recipe_ingredients.restaurant_id
      and rm.user_id = auth.uid()
      and rm.role::text in ('admin', 'manager')
  )
);

grant select, insert, update, delete
on public.inventory_items, public.product_recipes, public.recipe_ingredients
to authenticated;

grant select, insert
on public.inventory_movements
to authenticated;

commit;
