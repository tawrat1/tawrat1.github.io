-- Sell mode (REVIEW.md roadmap #2): scan -> stock -1, logged for reporting.
--
-- Applied directly to project cynvjtxxrbbjfehchqhe on 2026-07-20. This file documents
-- that change for the repo's history; it is not re-run automatically.

create table public.ss_sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.ss_businesses(id) on delete cascade,
  product_id uuid not null references public.ss_products(id) on delete cascade,
  warehouse_id uuid not null references public.ss_warehouses(id) on delete cascade,
  qty integer not null check (qty > 0),
  price_at_sale numeric(12,2) not null,
  sold_by uuid references public.ss_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index ss_sales_business_created_idx on public.ss_sales(business_id, created_at desc);
create index ss_sales_product_id_idx on public.ss_sales(product_id);

alter table public.ss_sales enable row level security;

-- Reporting is an owner concern (feeds the not-yet-built owner dashboard); workers
-- write sales through ss_record_sale below but never read the log back directly.
create policy "owner reads sales" on public.ss_sales
  for select using (business_id = ss_my_business_id() and ss_i_am_owner());

-- No INSERT/UPDATE/DELETE policy is defined for ss_sales at all: every write goes
-- through this SECURITY DEFINER function, same principle as the earlier fix that kept
-- workers off raw UPDATE on ss_stock (see 20260719_server_side_paywall_enforcement.sql).
-- The function derives the caller's own business_id server-side rather than trusting a
-- client-supplied value, and locks the stock row (FOR UPDATE) so two concurrent sales
-- of the same item can't lose an update.
--
-- Design choice: stock is allowed to go negative here (no floor at 0). Blocking a sale
-- because the tracked count is already off is worse for a cashier mid-checkout than
-- letting it go negative -- a negative number is itself a useful signal to the owner
-- that a recount is needed.
create or replace function public.ss_record_sale(p_product_id uuid, p_warehouse_id uuid, p_qty integer)
returns table(new_stock integer, sale_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_business_id uuid;
  v_member_id uuid;
  v_price numeric(12,2);
  v_stock integer;
  v_sale_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_qty is null or p_qty <= 0 then
    raise exception 'qty must be positive';
  end if;

  select business_id, id into v_business_id, v_member_id
  from public.ss_members where user_id = auth.uid();

  if v_business_id is null then
    raise exception 'not a member of a business';
  end if;
  if not public.ss_subscription_ok() then
    raise exception 'subscription inactive';
  end if;

  select price, stock into v_price, v_stock
  from public.ss_stock
  where product_id = p_product_id and warehouse_id = p_warehouse_id and business_id = v_business_id
  for update;

  if not found then
    raise exception 'product not stocked in this warehouse';
  end if;
  if v_price is null then
    raise exception 'product has no price in this warehouse';
  end if;

  update public.ss_stock
  set stock = stock - p_qty
  where product_id = p_product_id and warehouse_id = p_warehouse_id and business_id = v_business_id
  returning stock into v_stock;

  insert into public.ss_sales(business_id, product_id, warehouse_id, qty, price_at_sale, sold_by)
  values (v_business_id, p_product_id, p_warehouse_id, p_qty, v_price, v_member_id)
  returning id into v_sale_id;

  return query select v_stock, v_sale_id;
end;
$$;

revoke execute on function public.ss_record_sale(uuid, uuid, integer) from public, anon;
grant execute on function public.ss_record_sale(uuid, uuid, integer) to authenticated;
