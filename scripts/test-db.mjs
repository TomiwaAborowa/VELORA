import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

// Runs the Supabase migration + seed in an in-process Postgres (PGlite) with
// minimal auth/storage stubs, then exercises the order, payment and RLS rules.
const migrationPath = new URL("../supabase/migrations/20261031000000_init.sql", import.meta.url);
const seedPath = new URL("../supabase/seed.sql", import.meta.url);
const db = new PGlite({ extensions: { pg_trgm } });

// --- Minimal Supabase stubs -------------------------------------------------
await db.exec(`
  create schema auth; create schema extensions; create schema storage;
  create role anon; create role authenticated; create role service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text);
  alter table storage.objects enable row level security;
`);

await db.exec(readFileSync(migrationPath, "utf8"));
await db.exec(readFileSync(seedPath, "utf8"));
console.log("✓ migration + seed applied");

let failures = 0;
const check = (label, cond, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failures++;
};
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const asUser = (id) => db.exec(`select set_config('test.uid', '${id ?? ""}', false)`);
const expectError = async (label, sql, code) => {
  try {
    await db.query(sql);
    check(label, false, "no error raised");
  } catch (e) {
    check(label, !code || e.code === code, `${e.code}: ${e.message}`);
  }
};

const CUSTOMER = "11111111-1111-1111-1111-111111111111";
const ADMIN = "22222222-2222-2222-2222-222222222222";
const OTHER = "33333333-3333-3333-3333-333333333333";

await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
    ('${CUSTOMER}', 'ada@example.com', '{"full_name":"Ada Obi"}'),
    ('${ADMIN}', 'admin@example.com', '{}'),
    ('${OTHER}', 'other@example.com', '{}');
  update public.profiles set role = 'admin' where id = '${ADMIN}';
`);
check("profile trigger created profiles", (await one("select count(*)::int as n from profiles")).n === 3);
check("full_name copied from metadata", (await one(`select full_name from profiles where id='${CUSTOMER}'`)).full_name === "Ada Obi");

const product = async (slug) => one("select id, stock, price from products where slug = $1", [slug]);
const lamp = await product("ceramic-table-lamp"); // 54000, stock 6
const tote = await product("canvas-tote"); // 12500, stock 30

// --- create_order ------------------------------------------------------------
await db.exec(`insert into cart_items (user_id, product_id, quantity) values
  ('${CUSTOMER}', '${lamp.id}', 2), ('${CUSTOMER}', '${tote.id}', 1)`);
await asUser(CUSTOMER);
const order = await one(`select * from create_order('Ada Obi', '+2348012345678', '1 Marina Rd', 'Lagos', 'Lagos')`);
check("order totals computed server-side", Number(order.subtotal) === 120500 && Number(order.shipping_fee) === 0 && Number(order.total) === 120500,
  `subtotal ${order.subtotal}, shipping ${order.shipping_fee}, total ${order.total}`);
check("order number generated", /^VEL-\d+$/.test(order.order_number), order.order_number);
check("stock reserved", (await product("ceramic-table-lamp")).stock === 4 && (await product("canvas-tote")).stock === 29);
check("order items snapshot", (await one(`select count(*)::int as n from order_items where order_id='${order.id}'`)).n === 2);

// --- confirm_order_payment (idempotent) --------------------------------------
await db.exec(`update orders set payment_reference = 'REF-AAA111' where id = '${order.id}'`);
const paid = await one(`select * from confirm_order_payment('REF-AAA111', 12050000, 'tx1')`);
check("payment confirmed", paid.payment_status === "paid" && paid.status === "processing");
check("cart cleared after payment", (await one(`select count(*)::int as n from cart_items where user_id='${CUSTOMER}'`)).n === 0);
const again = await one(`select * from confirm_order_payment('REF-AAA111', 12050000, 'tx1')`);
check("second confirmation is a no-op", again.payment_status === "paid" && (await product("ceramic-table-lamp")).stock === 4);

// --- stock validation & amount mismatch -----------------------------------------
await db.exec(`insert into cart_items (user_id, product_id, quantity) values ('${CUSTOMER}', '${lamp.id}', 5)`);
await expectError("insufficient stock rejected", `select create_order('Ada', '+2348012345678', '1 Marina Rd', 'Lagos', 'Lagos')`, "VL400");
await db.exec(`update cart_items set quantity = 1 where user_id = '${CUSTOMER}'`);
const order2 = await one(`select * from create_order('Ada', '+2348012345678', '1 Marina Rd', 'Lagos', 'Lagos')`);
check("free shipping at threshold", Number(order2.shipping_fee) === 0 && Number(order2.total) === 54000);
await db.exec(`update orders set payment_reference = 'REF-BBB222' where id = '${order2.id}'`);
const mismatch = await one(`select * from confirm_order_payment('REF-BBB222', 100, 'tx2')`);
check("amount mismatch marks payment failed", mismatch.payment_status === "failed", mismatch.admin_note);

// New checkout supersedes the previous unpaid order and returns its stock.
const order3 = await one(`select * from create_order('Ada', '+2348012345678', '1 Marina Rd', 'Lagos', 'Lagos')`);
const superseded = await one(`select status, stock_reserved from orders where id = '${order2.id}'`);
check("previous unpaid order superseded", superseded.status === "cancelled" && !superseded.stock_reserved);
check("stock not double-reserved", (await product("ceramic-table-lamp")).stock === 3);

// Paying a cancelled order re-reserves stock if available.
await db.exec(`update orders set payment_reference = 'REF-CCC333' where id = '${order2.id}'`);
const late = await one(`select * from confirm_order_payment('REF-CCC333', 5400000, 'tx3')`);
check("late payment re-reserves stock", late.status === "processing" && late.payment_status === "paid" && (await product("ceramic-table-lamp")).stock === 2);

await asUser(null);
await expectError("anonymous cannot create orders", `select create_order('A', '+2348012345678', 'addr 1', 'Lagos', 'Lagos')`, "VL401");

// --- admin functions -----------------------------------------------------------
await asUser(CUSTOMER);
await expectError("customer cannot update order status", `select admin_update_order_status('${order.id}', 'shipped')`, "VL403");
await expectError("customer cannot read stats", `select admin_stats()`, "VL403");
await asUser(ADMIN);
await expectError("unpaid order cannot be shipped", `select admin_update_order_status('${order3.id}', 'shipped')`, "VL400");
const shipped = await one(`select * from admin_update_order_status('${order.id}', 'shipped')`);
check("admin ships paid order", shipped.status === "shipped");
const before = (await product("canvas-tote")).stock;
await one(`select * from admin_update_order_status('${order.id}', 'cancelled')`);
check("cancelling restores stock", (await product("canvas-tote")).stock === before + 1 && (await product("ceramic-table-lamp")).stock === 4);
await expectError("cancelled order is final", `select admin_update_order_status('${order.id}', 'processing')`, "VL400");
const stats = (await one(`select admin_stats() as s`)).s;
check("admin stats", stats.paid_orders === 2 && Number(stats.revenue) === 54000 && stats.daily_revenue.length === 14,
  JSON.stringify({ revenue: stats.revenue, paid: stats.paid_orders, days: stats.daily_revenue.length }));

// --- RLS as the authenticated role -------------------------------------------------
await db.exec(`set role authenticated`);
await asUser(OTHER);
check("RLS: other user sees no orders", (await one("select count(*)::int as n from orders")).n === 0);
check("RLS: other user sees no order items", (await one("select count(*)::int as n from order_items")).n === 0);
await expectError("RLS: customer cannot insert orders", `insert into orders (user_id, subtotal, shipping_fee, total, email, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_state) values ('${OTHER}', 0, 0, 0, 'x', 'x', 'x', 'x', 'x', 'x')`, "42501");
await expectError("RLS: customer cannot promote self", `update profiles set role = 'admin' where id = '${OTHER}'`, "42501");
await db.query(`update profiles set full_name = 'Renamed' where id = '${OTHER}'`);
check("RLS: customer can update own name", (await one(`select full_name from profiles where id='${OTHER}'`)).full_name === "Renamed");
const otherCart = await db.query(`update cart_items set quantity = 9 where user_id = '${CUSTOMER}' returning *`);
check("RLS: cannot modify another user's cart", otherCart.rows.length === 0);
await expectError("RLS: customer cannot create products", `insert into products (name, slug, price) values ('Hack', 'hack', 1)`, "42501");
await expectError("customer cannot call confirm_order_payment", `select confirm_order_payment('REF-AAA111', 1, 'x')`, "42501");
await db.exec(`update products set is_active = false where slug = 'canvas-tote'`); // silently filtered by RLS
await asUser(ADMIN);
check("RLS: admin sees all orders", (await one("select count(*)::int as n from orders")).n === 3);
await db.exec(`update products set is_active = false where slug = 'canvas-tote'`);
await asUser(OTHER);
check("RLS: hidden products invisible to customers", (await one("select count(*)::int as n from products where slug='canvas-tote'")).n === 0);
await db.exec(`set role anon`);
await asUser(null);
check("RLS: anon can browse active products", (await one("select count(*)::int as n from products")).n === 15);
check("RLS: anon cannot read profiles", (await one("select count(*)::int as n from profiles")).n === 0);
await db.exec(`reset role`);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
