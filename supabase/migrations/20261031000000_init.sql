-- =============================================================================
-- Velora marketplace — initial schema
-- Tables, Row Level Security, transactional order/payment functions, storage.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('customer', 'admin');
create type public.order_status as enum ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
create type public.payment_status as enum ('unpaid', 'paid', 'failed');

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text check (char_length(full_name) <= 100),
  phone       text check (char_length(phone) <= 30),
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role check used by RLS policies and functions. SECURITY DEFINER avoids
-- recursive RLS evaluation on profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Catalogue
-- -----------------------------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 60),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text check (char_length(description) <= 500),
  created_at   timestamptz not null default now()
);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references public.categories (id) on delete set null,
  name         text not null check (char_length(name) between 2 and 120),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text not null default '' check (char_length(description) <= 5000),
  price        numeric(12, 2) not null check (price >= 0),
  stock        integer not null default 0 check (stock >= 0),
  images       text[] not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_created_at_idx on public.products (created_at desc);
create index products_price_idx on public.products (price);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Cart (persisted for authenticated customers)
-- -----------------------------------------------------------------------------
create table public.cart_items (
  user_id     uuid not null references auth.users (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  quantity    integer not null check (quantity between 1 and 99),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

create trigger cart_items_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create sequence public.order_number_seq start 10001;

create table public.orders (
  id                       uuid primary key default gen_random_uuid(),
  order_number             text not null unique default ('VEL-' || nextval('public.order_number_seq')),
  user_id                  uuid references auth.users (id) on delete set null,
  status                   public.order_status not null default 'pending',
  payment_status           public.payment_status not null default 'unpaid',
  subtotal                 numeric(12, 2) not null check (subtotal >= 0),
  shipping_fee             numeric(12, 2) not null check (shipping_fee >= 0),
  total                    numeric(12, 2) not null check (total >= 0),
  currency                 text not null default 'NGN',
  email                    text not null,
  shipping_name            text not null,
  shipping_phone           text not null,
  shipping_address         text not null,
  shipping_city            text not null,
  shipping_state           text not null,
  shipping_postal_code     text,
  delivery_notes           text,
  payment_reference        text unique,
  paystack_transaction_id  text,
  paid_at                  timestamptz,
  stock_reserved           boolean not null default false,
  admin_note               text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  product_id     uuid references public.products (id) on delete set null,
  product_name   text not null,
  product_slug   text,
  product_image  text,
  unit_price     numeric(12, 2) not null check (unit_price >= 0),
  quantity       integer not null check (quantity > 0),
  line_total     numeric(12, 2) not null check (line_total >= 0)
);

create index order_items_order_id_idx on public.order_items (order_id);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.cart_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Profiles: users read/update their own row; admins read all.
create policy "Profiles are readable by owner or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "Profiles are updatable by owner" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Column-level privileges: customers may only change their name and phone,
-- never their role or email.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Categories: public read, admin write.
create policy "Categories are public" on public.categories
  for select to anon, authenticated using (true);
create policy "Admins insert categories" on public.categories
  for insert to authenticated with check (public.is_admin());
create policy "Admins update categories" on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete categories" on public.categories
  for delete to authenticated using (public.is_admin());

-- Products: active products are public; admins see and manage everything.
create policy "Active products are public" on public.products
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "Admins insert products" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "Admins update products" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete products" on public.products
  for delete to authenticated using (public.is_admin());

-- Cart: owners only.
create policy "Users manage their own cart" on public.cart_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Orders: read-only through the API; writes happen in SECURITY DEFINER
-- functions or with the service role after payment verification.
create policy "Orders are readable by owner or admin" on public.orders
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.orders from anon, authenticated;

create policy "Order items are readable by order owner or admin" on public.order_items
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = (select auth.uid())
    )
  );
revoke insert, update, delete on public.order_items from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Order functions
-- Custom SQLSTATEs surfaced to the API:
--   VL400 — business rule violation (message is safe to show to the user)
--   VL401 — not authenticated
--   VL403 — forbidden
--   VL404 — not found
-- -----------------------------------------------------------------------------

-- Return reserved stock for an order to inventory.
create or replace function public._restore_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.products p
     set stock = p.stock + oi.quantity
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.product_id = p.id;

  update public.orders set stock_reserved = false where id = p_order_id;
end;
$$;

-- Cancel unpaid orders older than 60 minutes so their reserved stock returns
-- to inventory. Called lazily whenever a new order is placed.
create or replace function public.release_expired_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select id from public.orders
     where status = 'pending'
       and payment_status <> 'paid'
       and stock_reserved
       and created_at < now() - interval '60 minutes'
     for update skip locked
  loop
    perform public._restore_order_stock(r.id);
    update public.orders
       set status = 'cancelled',
           admin_note = 'Automatically cancelled: payment was not completed within 60 minutes.'
     where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Create an order from the caller's cart. Prices, stock and totals are all
-- computed here from the database — nothing is trusted from the client.
-- Stock is reserved immediately and released if the order is cancelled.
create or replace function public.create_order(
  p_shipping_name text,
  p_shipping_phone text,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_state text,
  p_shipping_postal_code text default null,
  p_delivery_notes text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_order public.orders;
  v_subtotal numeric(12, 2) := 0;
  v_shipping numeric(12, 2);
  v_lines integer := 0;
  v_previous record;
  r record;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to place an order' using errcode = 'VL401';
  end if;

  select email into v_email from public.profiles where id = v_user_id;

  perform public.release_expired_orders();

  -- Starting a new checkout supersedes the customer's earlier unpaid orders,
  -- so their own reservations never block them.
  for v_previous in
    select id from public.orders
     where user_id = v_user_id and status = 'pending' and payment_status <> 'paid'
     for update
  loop
    if (select stock_reserved from public.orders where id = v_previous.id) then
      perform public._restore_order_stock(v_previous.id);
    end if;
    update public.orders
       set status = 'cancelled',
           admin_note = 'Superseded by a newer checkout.'
     where id = v_previous.id;
  end loop;

  -- Lock the products in the cart (consistent order avoids deadlocks).
  for r in
    select c.quantity, p.id, p.name, p.price, p.stock, p.is_active
      from public.cart_items c
      join public.products p on p.id = c.product_id
     where c.user_id = v_user_id
     order by p.id
     for update of p
  loop
    v_lines := v_lines + 1;
    if not r.is_active then
      raise exception '"%" is no longer available. Please remove it from your cart.', r.name using errcode = 'VL400';
    end if;
    if r.quantity > r.stock then
      if r.stock = 0 then
        raise exception '"%" is out of stock. Please remove it from your cart.', r.name using errcode = 'VL400';
      end if;
      raise exception 'Only % of "%" left in stock. Please update your cart.', r.stock, r.name using errcode = 'VL400';
    end if;
    v_subtotal := v_subtotal + r.price * r.quantity;
  end loop;

  if v_lines = 0 then
    raise exception 'Your cart is empty' using errcode = 'VL400';
  end if;

  -- Flat-rate delivery, free above ₦50,000. Mirrored in src/lib/constants.ts
  -- for display only.
  v_shipping := case when v_subtotal >= 50000 then 0 else 2500 end;

  insert into public.orders (
    user_id, subtotal, shipping_fee, total, email,
    shipping_name, shipping_phone, shipping_address, shipping_city,
    shipping_state, shipping_postal_code, delivery_notes, stock_reserved
  ) values (
    v_user_id, v_subtotal, v_shipping, v_subtotal + v_shipping, v_email,
    p_shipping_name, p_shipping_phone, p_shipping_address, p_shipping_city,
    p_shipping_state, nullif(p_shipping_postal_code, ''), nullif(p_delivery_notes, ''), true
  )
  returning * into v_order;

  insert into public.order_items (
    order_id, product_id, product_name, product_slug, product_image,
    unit_price, quantity, line_total
  )
  select v_order.id, p.id, p.name, p.slug, p.images[1], p.price, c.quantity, p.price * c.quantity
    from public.cart_items c
    join public.products p on p.id = c.product_id
   where c.user_id = v_user_id;

  update public.products p
     set stock = p.stock - c.quantity
    from public.cart_items c
   where c.user_id = v_user_id
     and c.product_id = p.id;

  return v_order;
end;
$$;

-- Record a payment that has been verified with Paystack. Idempotent: calling
-- it again for an already-paid order is a no-op, which prevents duplicate
-- processing when both the callback and the webhook arrive.
create or replace function public.confirm_order_payment(
  p_reference text,
  p_amount_kobo bigint,
  p_transaction_id text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_in_stock boolean := true;
  r record;
begin
  select * into v_order from public.orders where payment_reference = p_reference for update;
  if not found then
    raise exception 'No order found for this payment reference' using errcode = 'VL404';
  end if;

  if v_order.payment_status = 'paid' then
    return v_order;
  end if;

  if p_amount_kobo <> round(v_order.total * 100)::bigint then
    update public.orders
       set payment_status = 'failed',
           admin_note = format('Amount mismatch: expected %s kobo, received %s kobo.', round(v_order.total * 100)::bigint, p_amount_kobo)
     where id = v_order.id
     returning * into v_order;
    return v_order;
  end if;

  -- The order expired (or was superseded) while the customer was paying:
  -- try to reserve its stock again.
  if not v_order.stock_reserved then
    if exists (select 1 from public.order_items where order_id = v_order.id and product_id is null) then
      v_in_stock := false;
    end if;
    for r in
      select oi.quantity, p.stock
        from public.order_items oi
        join public.products p on p.id = oi.product_id
       where oi.order_id = v_order.id
       order by p.id
       for update of p
    loop
      if r.stock < r.quantity then
        v_in_stock := false;
      end if;
    end loop;
    if v_in_stock then
      update public.products p
         set stock = p.stock - oi.quantity
        from public.order_items oi
       where oi.order_id = v_order.id and p.id = oi.product_id;
    end if;
  end if;

  update public.orders
     set payment_status = 'paid',
         paid_at = now(),
         paystack_transaction_id = p_transaction_id,
         status = case when v_in_stock then 'processing'::public.order_status else 'cancelled'::public.order_status end,
         stock_reserved = v_in_stock,
         admin_note = case when v_in_stock then admin_note
                           else 'Paid after the reservation expired and stock is no longer available. Refund required.' end
   where id = v_order.id
   returning * into v_order;

  -- Remove purchased products from the customer's cart.
  delete from public.cart_items c
   using public.order_items oi
   where oi.order_id = v_order.id
     and c.user_id = v_order.user_id
     and c.product_id = oi.product_id;

  return v_order;
end;
$$;

-- Admin order status changes, with stock restored on cancellation.
create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update orders' using errcode = 'VL403';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'VL404';
  end if;

  if v_order.status = p_status then
    return v_order;
  end if;
  if v_order.status in ('cancelled', 'delivered') then
    raise exception 'A % order can no longer be changed', v_order.status using errcode = 'VL400';
  end if;
  if p_status = 'pending' then
    raise exception 'An order cannot be moved back to pending' using errcode = 'VL400';
  end if;
  if p_status in ('processing', 'shipped', 'delivered') and v_order.payment_status <> 'paid' then
    raise exception 'This order has not been paid yet' using errcode = 'VL400';
  end if;

  if p_status = 'cancelled' and v_order.stock_reserved then
    perform public._restore_order_stock(v_order.id);
  end if;

  update public.orders set status = p_status where id = p_order_id returning * into v_order;
  return v_order;
end;
$$;

-- Basic sales statistics for the admin dashboard.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view statistics' using errcode = 'VL403';
  end if;

  select jsonb_build_object(
    'revenue', coalesce((select sum(total) from public.orders where payment_status = 'paid' and status <> 'cancelled'), 0),
    'paid_orders', (select count(*) from public.orders where payment_status = 'paid'),
    'total_orders', (select count(*) from public.orders),
    'awaiting_fulfilment', (select count(*) from public.orders where status = 'processing'),
    'customers', (select count(*) from public.profiles where role = 'customer'),
    'products', (select count(*) from public.products),
    'low_stock', (select count(*) from public.products where is_active and stock <= 5),
    'daily_revenue', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d.day, 'revenue', d.revenue, 'orders', d.orders) order by d.day), '[]'::jsonb)
        from (
          select days.day::date as day,
                 coalesce(sum(o.total), 0) as revenue,
                 count(o.id) as orders
            from generate_series(current_date - 13, current_date, interval '1 day') as days(day)
            left join public.orders o
              on o.paid_at::date = days.day::date
             and o.payment_status = 'paid'
             and o.status <> 'cancelled'
           group by days.day
        ) d
    )
  ) into v_result;

  return v_result;
end;
$$;

-- Function privileges: Supabase grants EXECUTE to everyone by default.
revoke execute on function public._restore_order_stock(uuid) from public, anon, authenticated;
revoke execute on function public.release_expired_orders() from public, anon, authenticated;
revoke execute on function public.confirm_order_payment(text, bigint, text) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(text, bigint, text) to service_role;
revoke execute on function public.create_order(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.create_order(text, text, text, text, text, text, text) to authenticated;
revoke execute on function public.admin_update_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.admin_update_order_status(uuid, public.order_status) to authenticated;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage: public product image bucket, admin-only writes
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "Admins upload product images" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "Admins update product images" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "Admins delete product images" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
