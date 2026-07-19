-- Server-side paywall enforcement (REVIEW.md weakness #1)
--
-- Before this migration, subscriptionOk() only ran client-side in app.js — RLS never
-- checked trial_ends_at/subscription_status, and worse, the "owner updates business"
-- policy had no column restriction, so any owner could call the REST API directly and
-- set their own subscription_status='active' with a far-future trial_ends_at, bypassing
-- the paywall entirely.
--
-- Applied directly to project cynvjtxxrbbjfehchqhe on 2026-07-19 (all ss_ tables had
-- 0 rows, so no data migration was needed). This file documents that change for the
-- repo's history; it is not re-run automatically.

-- 1. Subscription check helper
create or replace function public.ss_subscription_ok()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.ss_businesses b
    where b.id = ss_my_business_id()
      and (b.subscription_status = 'active'
           or (b.subscription_status = 'trial' and b.trial_ends_at > now()))
  );
$$;

revoke execute on function public.ss_subscription_ok() from public, anon;
grant execute on function public.ss_subscription_ok() to authenticated, service_role;

-- 2. Require an active/non-expired subscription to create or modify products, stock, warehouses.
--    Reads and deletes are left unrestricted so an expired owner can still view and clean up data.
alter policy "owner inserts products" on public.ss_products
  with check (business_id = ss_my_business_id() and ss_i_am_owner() and ss_subscription_ok());

alter policy "owner updates products" on public.ss_products
  using (business_id = ss_my_business_id() and ss_i_am_owner())
  with check (business_id = ss_my_business_id() and ss_subscription_ok());

alter policy "owner inserts stock" on public.ss_stock
  with check (business_id = ss_my_business_id() and ss_i_am_owner() and ss_subscription_ok());

alter policy "owner updates stock" on public.ss_stock
  using (business_id = ss_my_business_id() and ss_i_am_owner())
  with check (business_id = ss_my_business_id() and ss_subscription_ok());

alter policy "owner inserts warehouses" on public.ss_warehouses
  with check (business_id = ss_my_business_id() and ss_i_am_owner() and ss_subscription_ok());

alter policy "owner updates warehouses" on public.ss_warehouses
  using (business_id = ss_my_business_id() and ss_i_am_owner())
  with check (business_id = ss_my_business_id() and ss_subscription_ok());

-- 3. Prevent owners from self-mutating billing-critical columns via direct REST calls;
--    only service-role callers (edge functions, SQL editor) may change them. auth.role()
--    returns 'authenticated' for normal client JWTs and something else for service-role
--    / SQL-editor calls, so the manual-activation runbook and the future Stripe webhook
--    are unaffected.
create or replace function public.ss_businesses_protect_billing_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.role() = 'authenticated' then
    new.subscription_status := old.subscription_status;
    new.trial_ends_at := old.trial_ends_at;
    new.join_code := old.join_code;
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.ss_businesses_protect_billing_columns() from public, anon, authenticated;

drop trigger if exists ss_businesses_protect_billing_columns_trg on public.ss_businesses;
create trigger ss_businesses_protect_billing_columns_trg
  before update on public.ss_businesses
  for each row execute function public.ss_businesses_protect_billing_columns();
