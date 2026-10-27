create extension if not exists pgcrypto;
create sequence if not exists public.order_reference_seq start with 1;

-- Public storefront roles need schema usage, but never object-creation privileges.
revoke create on schema public from public, anon, authenticated;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  is_active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  short_description text,
  description text,
  ingredients text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  weight_value numeric(10,3) not null check (weight_value > 0),
  weight_unit text not null check (weight_unit in ('g', 'kg', 'ml', 'l')),
  price numeric(10,2) not null check (price > 0),
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  track_stock boolean not null default true,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_weight_unique unique (product_id, weight_value, weight_unit),
  constraint product_variants_sale_price_check check (sale_price is null or sale_price <= price)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null check (char_length(btrim(storage_path)) > 0),
  alt_text text,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  constraint product_images_storage_path_unique unique (storage_path)
);

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique check (order_reference ~ '^KS-[0-9]{8}-[0-9]{4,}$'),
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 120),
  customer_phone text not null check (char_length(btrim(customer_phone)) between 7 and 24),
  customer_phone_digits text not null check (customer_phone_digits ~ '^[0-9]{7,15}$'),
  delivery_address text not null check (char_length(btrim(delivery_address)) between 10 and 1000),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  shipping_charge numeric(10,2) check (shipping_charge is null or shipping_charge >= 0),
  final_total numeric(10,2) check (final_total is null or final_total >= 0),
  status text not null default 'pending_confirmation' check (status in ('pending_confirmation', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled')),
  admin_note text,
  submission_key uuid not null unique,
  stock_restored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_check check (final_total is null or shipping_charge is null or final_total = subtotal + shipping_charge)
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name_snapshot text not null,
  variant_snapshot text not null,
  quantity integer not null check (quantity > 0 and quantity <= 99),
  unit_price_snapshot numeric(10,2) not null check (unit_price_snapshot >= 0),
  line_total numeric(10,2) not null check (line_total >= 0),
  stock_tracked boolean not null default false,
  constraint order_items_variant_unique unique (order_id, variant_id)
);

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  admin_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('status_changed', 'shipping_updated')),
  old_status text check (old_status is null or old_status in ('pending_confirmation', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled')),
  new_status text check (new_status is null or new_status in ('pending_confirmation', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists categories_active_order_idx on public.categories (is_active, display_order);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_order_idx on public.products (is_active, display_order);
create index if not exists products_featured_idx on public.products (is_featured) where is_featured = true;
create index if not exists product_variants_product_idx on public.product_variants (product_id, display_order);
create index if not exists product_images_product_idx on public.product_images (product_id, display_order);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at before update on public.product_variants for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.order_response(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'order_id', o.id,
    'order_reference', o.order_reference,
    'status', o.status,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'delivery_address', o.delivery_address,
    'subtotal', o.subtotal,
    'shipping_charge', o.shipping_charge,
    'final_total', o.final_total,
    'created_at', o.created_at,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'product_id', oi.product_id,
            'variant_id', oi.variant_id,
            'product_name_snapshot', oi.product_name_snapshot,
            'variant_snapshot', oi.variant_snapshot,
            'quantity', oi.quantity,
            'unit_price_snapshot', oi.unit_price_snapshot,
            'line_total', oi.line_total
          )
          order by oi.id
        )
        from public.order_items oi
        where oi.order_id = o.id
      ),
      '[]'::jsonb
    )
  )
  from public.orders o
  where o.id = p_order_id;
$$;

create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_items jsonb,
  p_submission_key uuid,
  p_expected_prices jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.orders%rowtype;
  v_name text := btrim(coalesce(p_customer_name, ''));
  v_phone text := btrim(coalesce(p_customer_phone, ''));
  v_phone_digits text;
  v_address text := btrim(coalesce(p_delivery_address, ''));
  v_input_count integer;
  v_line_count integer;
  v_order_id uuid;
  v_order_reference text;
  v_subtotal numeric(10,2) := 0;
  v_effective_price numeric(10,2);
  v_expected_price numeric(10,2);
  v_variant_label text;
  v_line_total numeric(10,2);
  v_item record;
  v_variant record;
begin
  if p_submission_key is null then
    raise exception 'INVALID_SUBMISSION_KEY: A checkout submission key is required.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_submission_key::text, 0));

  select * into v_existing
  from public.orders
  where submission_key = p_submission_key;

  if found then
    return public.order_response(v_existing.id);
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'INVALID_NAME: Enter a name between 2 and 120 characters.';
  end if;

  if char_length(v_phone) < 7 or char_length(v_phone) > 24 or v_phone !~ '^[0-9+() .-]{7,24}$' then
    raise exception 'INVALID_PHONE: Enter a valid phone number.';
  end if;

  v_phone_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
  if char_length(v_phone_digits) < 7 or char_length(v_phone_digits) > 15 then
    raise exception 'INVALID_PHONE: Enter a phone number with 7 to 15 digits.';
  end if;

  if char_length(v_address) < 10 or char_length(v_address) > 1000 then
    raise exception 'INVALID_ADDRESS: Enter a delivery address between 10 and 1,000 characters.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'INVALID_ITEMS: The order must contain at least one product.';
  end if;

  if p_expected_prices is null or jsonb_typeof(p_expected_prices) <> 'object' then
    raise exception 'INVALID_EXPECTED_PRICES: The price check could not be completed.';
  end if;

  drop table if exists pg_temp._kayam_order_input;
  create temp table _kayam_order_input (
    product_id uuid,
    variant_id uuid,
    quantity integer
  ) on commit drop;

  begin
    insert into pg_temp._kayam_order_input (product_id, variant_id, quantity)
    select product_id, variant_id, quantity
    from jsonb_to_recordset(p_items) as item(product_id uuid, variant_id uuid, quantity integer);
  exception
    when others then
      raise exception 'INVALID_ITEMS: The selected products and quantities are invalid.';
  end;

  select count(*) into v_input_count from pg_temp._kayam_order_input;
  if v_input_count = 0 or v_input_count > 50 then
    raise exception 'INVALID_ITEMS: An order must contain between 1 and 50 line items.';
  end if;

  if exists (
    select 1
    from pg_temp._kayam_order_input
    where product_id is null
       or variant_id is null
       or quantity is null
       or quantity < 1
       or quantity > 99
  ) then
    raise exception 'INVALID_ITEMS: Each line must have a valid product, weight, and quantity.';
  end if;

  if exists (
    select 1
    from pg_temp._kayam_order_input
    group by variant_id
    having count(*) > 1
  ) then
    raise exception 'INVALID_ITEMS: The same weight option cannot appear more than once.';
  end if;

  if exists (
    select 1
    from pg_temp._kayam_order_input i
    left join public.product_variants v on v.id = i.variant_id
    left join public.products p on p.id = i.product_id
    where v.id is null
       or p.id is null
       or v.product_id <> i.product_id
       or v.is_active is not true
       or p.is_active is not true
  ) then
    raise exception 'ITEM_UNAVAILABLE: One or more selected products or weights are unavailable.';
  end if;

  drop table if exists pg_temp._kayam_order_line;
  create temp table _kayam_order_line (
    product_id uuid,
    variant_id uuid,
    product_name text,
    variant_label text,
    quantity integer,
    unit_price numeric(10,2),
    line_total numeric(10,2),
    stock_tracked boolean
  ) on commit drop;

  for v_variant in
    select
      i.product_id,
      i.variant_id,
      i.quantity,
      p.name as product_name,
      p.is_active as product_is_active,
      v.product_id as linked_product_id,
      v.price,
      v.sale_price,
      v.track_stock,
      v.stock_quantity,
      v.is_active as variant_is_active,
      v.weight_value,
      v.weight_unit
    from pg_temp._kayam_order_input i
    join public.product_variants v on v.id = i.variant_id
    join public.products p on p.id = i.product_id
    order by v.id
    for update of v
  loop
    if v_variant.product_is_active is not true
       or v_variant.variant_is_active is not true
       or v_variant.linked_product_id <> v_variant.product_id then
      raise exception 'ITEM_UNAVAILABLE: % is no longer available.', v_variant.product_name;
    end if;

    v_effective_price := v_variant.price;
    if v_variant.sale_price is not null
       and v_variant.sale_price >= 0
       and v_variant.sale_price <= v_variant.price then
      v_effective_price := v_variant.sale_price;
    end if;

    begin
      v_expected_price := (p_expected_prices ->> v_variant.variant_id::text)::numeric(10,2);
    exception
      when others then
        v_expected_price := null;
    end;

    if v_expected_price is null or abs(v_expected_price - v_effective_price) > 0.001 then
      raise exception 'PRICE_CHANGED: The price for % has changed. Review the current price before ordering.', v_variant.product_name;
    end if;

    if v_variant.track_stock and v_variant.stock_quantity < v_variant.quantity then
      raise exception 'INSUFFICIENT_STOCK: % does not have enough stock for the selected quantity.', v_variant.product_name;
    end if;

    if v_variant.track_stock then
      update public.product_variants
      set stock_quantity = stock_quantity - v_variant.quantity
      where id = v_variant.variant_id;
    end if;

    if v_variant.weight_value = trunc(v_variant.weight_value) then
      v_variant_label := trunc(v_variant.weight_value)::text;
    else
      v_variant_label := trim(trailing '.' from trim(trailing '0' from v_variant.weight_value::text));
    end if;
    v_variant_label := v_variant_label || ' ' ||
      case v_variant.weight_unit
        when 'l' then 'L'
        else v_variant.weight_unit
      end;

    v_line_total := round(v_variant.quantity * v_effective_price, 2);
    v_subtotal := v_subtotal + v_line_total;

    insert into pg_temp._kayam_order_line (
      product_id,
      variant_id,
      product_name,
      variant_label,
      quantity,
      unit_price,
      line_total,
      stock_tracked
    ) values (
      v_variant.product_id,
      v_variant.variant_id,
      v_variant.product_name,
      v_variant_label,
      v_variant.quantity,
      v_effective_price,
      v_line_total,
      v_variant.track_stock
    );
  end loop;

  select count(*) into v_line_count from pg_temp._kayam_order_line;
  if v_line_count <> v_input_count then
    raise exception 'ITEM_UNAVAILABLE: One or more selected products or weights are unavailable.';
  end if;

  v_order_reference := 'KS-' ||
    to_char((now() at time zone 'Asia/Kolkata'), 'YYYYMMDD') || '-' ||
    lpad(nextval('public.order_reference_seq')::text, 4, '0');

  insert into public.orders (
    order_reference,
    customer_name,
    customer_phone,
    customer_phone_digits,
    delivery_address,
    subtotal,
    shipping_charge,
    final_total,
    status,
    submission_key
  ) values (
    v_order_reference,
    v_name,
    v_phone,
    v_phone_digits,
    v_address,
    v_subtotal,
    null,
    null,
    'pending_confirmation',
    p_submission_key
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    variant_id,
    product_name_snapshot,
    variant_snapshot,
    quantity,
    unit_price_snapshot,
    line_total,
    stock_tracked
  )
  select
    v_order_id,
    l.product_id,
    l.variant_id,
    l.product_name,
    l.variant_label,
    l.quantity,
    l.unit_price,
    l.line_total,
    l.stock_tracked
  from pg_temp._kayam_order_line l;

  return public.order_response(v_order_id);
end;
$$;

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_old_status text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED: Administrator access is required.';
  end if;

  if p_status is null or p_status not in ('pending_confirmation', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled') then
    raise exception 'INVALID_STATUS: Select a valid order status.';
  end if;

  if p_note is not null and char_length(p_note) > 1000 then
    raise exception 'INVALID_NOTE: Notes must be 1,000 characters or fewer.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND: The order could not be found.';
  end if;

  v_old_status := v_order.status;

  if v_old_status = p_status then
    return public.order_response(v_order.id);
  end if;

  if not (
    (v_old_status = 'pending_confirmation' and p_status in ('confirmed', 'cancelled'))
    or (v_old_status = 'confirmed' and p_status in ('processing', 'cancelled'))
    or (v_old_status = 'processing' and p_status in ('dispatched', 'cancelled'))
    or (v_old_status = 'dispatched' and p_status in ('delivered', 'cancelled'))
  ) then
    raise exception 'INVALID_STATUS_TRANSITION: The order cannot move from % to %.', v_old_status, p_status;
  end if;

  if p_status = 'cancelled' and v_order.stock_restored_at is null then
    update public.product_variants v
    set stock_quantity = v.stock_quantity + oi.quantity
    from public.order_items oi
    where oi.order_id = v_order.id
      and oi.variant_id = v.id
      and oi.stock_tracked = true;

    update public.orders
    set stock_restored_at = now()
    where id = v_order.id;
  end if;

  update public.orders
  set status = p_status,
      admin_note = coalesce(v_note, admin_note)
  where id = v_order.id;

  insert into public.order_events (
    order_id,
    admin_user_id,
    event_type,
    old_status,
    new_status,
    note
  ) values (
    v_order.id,
    auth.uid(),
    'status_changed',
    v_old_status,
    p_status,
    v_note
  );

  return public.order_response(v_order.id);
end;
$$;

create or replace function public.admin_set_order_shipping(
  p_order_id uuid,
  p_shipping_charge numeric,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED: Administrator access is required.';
  end if;

  if p_shipping_charge is null or p_shipping_charge < 0 or p_shipping_charge > 1000000 then
    raise exception 'INVALID_SHIPPING: Enter a valid non-negative delivery charge.';
  end if;

  if p_note is not null and char_length(p_note) > 1000 then
    raise exception 'INVALID_NOTE: Notes must be 1,000 characters or fewer.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND: The order could not be found.';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'INVALID_STATUS: Delivery charges cannot be set on a cancelled order.';
  end if;

  update public.orders
  set shipping_charge = round(p_shipping_charge, 2),
      final_total = round(subtotal + p_shipping_charge, 2),
      admin_note = coalesce(v_note, admin_note)
  where id = v_order.id;

  insert into public.order_events (
    order_id,
    admin_user_id,
    event_type,
    old_status,
    new_status,
    note
  ) values (
    v_order.id,
    auth.uid(),
    'shipping_updated',
    v_order.status,
    v_order.status,
    v_note
  );

  return public.order_response(v_order.id);
end;
$$;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select to anon, authenticated using (is_active = true);

drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select to anon, authenticated using (is_active = true);

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_public_read on public.product_variants for select to anon, authenticated using (
  is_active = true
  and exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.is_active = true
  )
);

drop policy if exists product_variants_admin_all on public.product_variants;
create policy product_variants_admin_all on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images for select to anon, authenticated using (
  exists (
    select 1
    from public.products p
    where p.id = product_id
      and p.is_active = true
  )
);

drop policy if exists product_images_admin_all on public.product_images;
create policy product_images_admin_all on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_profiles_read on public.admin_profiles;
create policy admin_profiles_read on public.admin_profiles for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists admin_profiles_self_update on public.admin_profiles;
create policy admin_profiles_self_update on public.admin_profiles for update to authenticated using (user_id = auth.uid() and is_active = true) with check (user_id = auth.uid() and is_active = true);

drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders for select to authenticated using (public.is_admin());

drop policy if exists order_items_admin_read on public.order_items;
create policy order_items_admin_read on public.order_items for select to authenticated using (public.is_admin());

drop policy if exists order_events_admin_read on public.order_events;
create policy order_events_admin_read on public.order_events for select to authenticated using (public.is_admin());

revoke all on table public.categories, public.products, public.product_variants, public.product_images from anon, authenticated;
grant select on table public.categories, public.products, public.product_variants, public.product_images to anon, authenticated;
grant insert, update, delete on table public.categories, public.products, public.product_variants, public.product_images to authenticated;

revoke all on table public.admin_profiles from anon, authenticated;
grant select on table public.admin_profiles to authenticated;
grant update (display_name) on table public.admin_profiles to authenticated;

revoke all on table public.orders, public.order_items, public.order_events from anon, authenticated;
grant select on table public.orders, public.order_items, public.order_events to authenticated;

revoke all on sequence public.order_reference_seq from anon, authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.order_response(uuid) from public, anon, authenticated;

revoke all on function public.create_order(text, text, text, jsonb, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(text, text, text, jsonb, uuid, jsonb) to anon, authenticated;

revoke all on function public.admin_update_order_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_update_order_status(uuid, text, text) to authenticated;

revoke all on function public.admin_set_order_shipping(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.admin_set_order_shipping(uuid, numeric, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_storage_public_read on storage.objects;
create policy product_images_storage_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists product_images_storage_admin_insert on storage.objects;
create policy product_images_storage_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_storage_admin_update on storage.objects;
create policy product_images_storage_admin_update on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_storage_admin_delete on storage.objects;
create policy product_images_storage_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

insert into public.categories (name, slug, description, display_order)
values
  ('Spice Powders', 'spice-powders', 'Everyday spice powders for Indian kitchens.', 1),
  ('Traditional Masalas', 'traditional-masalas', 'Traditional blends for familiar home cooking.', 2),
  ('Premixes', 'premixes', 'Convenient premixes for everyday meals.', 3),
  ('Cooking Masalas', 'cooking-masalas', 'Masalas for curries, biryanis, and special dishes.', 4),
  ('Podi & Chutney Powders', 'podi-chutney-powders', 'Podi and chutney powders to serve alongside meals.', 5)
on conflict (slug) do nothing;

insert into public.products (
  category_id,
  name,
  slug,
  short_description,
  description,
  is_featured,
  display_order
)
select
  c.id,
  seed.name,
  seed.slug,
  seed.short_description,
  seed.description,
  seed.is_featured,
  seed.display_order
from (
  values
    ('spice-powders', 'Chilli Powder', 'chilli-powder', 'An everyday spice powder for Indian cooking.', 'A spice powder from the KAYAM SPICES pantry. Weight options, ingredients, and product details will be published here when finalised.', true, 1),
    ('spice-powders', 'Turmeric Powder', 'turmeric-powder', 'A familiar pantry spice for everyday cooking.', 'A spice powder from the KAYAM SPICES pantry. Weight options, ingredients, and product details will be published here when finalised.', true, 2),
    ('traditional-masalas', 'Goda Masala', 'goda-masala', 'A traditional masala blend for everyday cooking.', 'A traditional masala from the KAYAM SPICES pantry. Weight options, ingredients, and product details will be published here when finalised.', true, 3),
    ('premixes', 'Sambar Premix', 'sambar-premix', 'A premix for preparing sambar at home.', 'A premix from the KAYAM SPICES pantry. Weight options, ingredients, and product details will be published here when finalised.', false, 4),
    ('premixes', 'Rasam Premix', 'rasam-premix', 'A premix for preparing rasam at home.', 'A premix from the KAYAM SPICES pantry. Weight options, ingredients, and product details will be published here when finalised.', false, 5),
    ('cooking-masalas', 'Chicken Masala', 'chicken-masala', 'A cooking masala for preparing chicken dishes.', 'A cooking masala from the KAYAM SPICES pantry. Weight options, ingredients, and product details will be published here when finalised.', false, 6),
    ('cooking-masalas', 'Meat Masala', 'meat-masala', 'A cooking masala for preparing meat dishes.', 'A cooking masala from the KAYAM SPICES pantry. Weight options, ingredients, and product details will be published here when finalised.', false, 7),
    ('cooking-masalas', 'Biryani Masala', 'biryani-masala', 'A masala blend for preparing biryani.', 'A cooking masala from the KAYAM SPICES pantry. Weight options, ingredients, and product details will be published here when finalised.', true, 8),
    ('podi-chutney-powders', 'Garlic Podi', 'garlic-podi', 'A garlicky podi for serving with everyday meals.', 'A podi from the KAYAM SPICES pantry. Weight options, ingredients, and product details will be published here when finalised.', false, 9),
    ('podi-chutney-powders', 'Gunpowder Podi', 'gunpowder-podi', 'A spicy podi for serving with rice, idli, or dosa.', 'A podi from the KAYAM SPICES pantry. Weight options, ingredients, and product details will be published here when finalised.', false, 10),
    ('podi-chutney-powders', 'Groundnut Chutney Powder', 'groundnut-chutney-powder', 'A nutty chutney powder for everyday meals.', 'A chutney powder from the KAYAM SPICES pantry. Weight options, ingredients, and product details will be published here when finalised.', false, 11)
) as seed(category_slug, name, slug, short_description, description, is_featured, display_order)
join public.categories c on c.slug = seed.category_slug
on conflict (slug) do nothing;
