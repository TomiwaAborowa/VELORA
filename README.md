# Velora

A full-stack e-commerce marketplace: customers browse, search and buy products; administrators manage the catalogue, inventory and orders. Payments run through Paystack in test mode, or a built-in demo payment flow when no Paystack key is configured.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Auth, Postgres with Row Level Security, Storage) · Zod · Paystack

---

## Features

| Area | What's included |
|---|---|
| **Auth** | Email/password registration, sign-in, sign-out, password reset by email, protected routes, separate admin role |
| **Catalogue** | Product listing with search by name, category filter, sort by newest/price, pagination, stock badges, product detail with image gallery |
| **Cart** | Add/remove/change quantity, live item count, stock limits enforced on client and server; guest cart in `localStorage`, persisted in Postgres once signed in (guest cart merges on login) |
| **Checkout** | Validated delivery form, server-computed totals, order + order items created atomically with stock reserved, Paystack hosted payment (or simulated demo payment), server-side verification, webhook |
| **Customer dashboard** | Overview, order history, order detail with progress tracker, retry payment for unpaid orders, profile settings |
| **Admin** | Sales dashboard (revenue, orders, customers, low stock, 14-day revenue chart), product CRUD with image upload, category management, order list with status filter/search, order status updates |

## Architecture

```
src/
├── proxy.ts                 # Refreshes the Supabase session; redirects anonymous users from protected pages
├── app/
│   ├── api/                 # REST API (route handlers) — see "API" below
│   ├── auth/callback/       # Email link landing (confirmation + password recovery)
│   ├── (pages)              # Storefront, /account/*, /admin/*, /cart, /checkout
├── components/              # UI primitives and shared components
└── lib/
    ├── api.ts               # Response envelope, error mapping, auth guards
    ├── validation.ts        # Zod schemas shared by the API and forms
    ├── payments.ts          # Paystack initialise/verify + idempotent recording
    ├── data/                # Server-side data access (runs as the signed-in user, under RLS)
    └── supabase/            # Server, proxy and service-role clients
supabase/
├── migrations/              # Schema, RLS policies, SQL functions, storage bucket
└── seed.sql                 # Demo categories and products
scripts/test-db.mjs          # Database test suite (runs in-process with PGlite)
```

**Rendering.** Pages are Server Components that read data directly through the data layer, with RLS applied. Interactive pieces (cart, forms, filters) are Client Components that call the REST API. `cacheComponents` is disabled because almost every page depends on the session.

**Business rules live in Postgres.** These run as transactional `SECURITY DEFINER` functions, so the client is never trusted with prices, totals or stock:

- `create_order()` locks the cart's products, validates availability and computes the subtotal, delivery fee and total. It then writes the order and order items and reserves the stock, all in one transaction.
- `confirm_order_payment()` is **idempotent**: a second call for a paid order does nothing, so the redirect and the webhook can both arrive safely. It rejects amount mismatches. If the reservation expired before payment completed, it re-reserves the stock; if the stock is gone, it flags the order for a refund.
- `admin_update_order_status()` enforces valid transitions and returns stock to inventory on cancellation.
- Unpaid orders release their stock after 60 minutes, or as soon as the same customer starts a new checkout.

**Security**

- RLS is enabled on every table. Customers can only see their own profile, cart, orders and order items. Catalogue writes are admin-only. Orders can't be written directly at all.
- Column-level grants mean customers can change only `full_name` and `phone` on their profile, never `role`.
- Admin access is checked three times: in the admin layout, in every admin API handler, and in the database.
- The service-role key is used only on the server, and only to record payments that Paystack has verified.
- Paystack webhooks are authenticated with an HMAC-SHA512 signature check.
- Every API input is validated with Zod.
- Redirect targets are restricted to same-origin paths.

## Getting started

### 1. Prerequisites

- Node.js 20.9+
- A [Supabase](https://supabase.com) project (the free tier is fine)
- *Optional:* a [Paystack](https://paystack.com) account with **test** keys. Without one, checkout uses the demo payment flow.

### 2. Install

```bash
npm install
cp .env.example .env.local   # then fill in the values
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your deployed URL in production |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (or the legacy `anon` key) |
| `SUPABASE_SECRET_KEY` | Supabase secret key (or legacy `service_role`). **Server only** |
| `PAYSTACK_SECRET_KEY` | *Optional.* Paystack → Settings → API Keys & Webhooks (`sk_test_…`). Without it, checkout runs in demo payment mode |

### 3. Set up the database

Run the SQL files in the Supabase **SQL Editor**, in this order:

1. `supabase/migrations/20261031000000_init.sql`
2. `supabase/seed.sql` (optional demo catalogue)

If you use the Supabase CLI instead: `supabase link` then `supabase db push`.

### 4. Configure Supabase Auth

In **Authentication → URL Configuration**:
- **Site URL**: `NEXT_PUBLIC_SITE_URL`
- **Redirect URLs**: add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`

Email confirmation can stay on (users confirm, then sign in) or be turned off for quicker demos.

> Password-reset links use the PKCE flow, so they must be opened in the browser that requested them. To support any browser, change the *Reset Password* email template link to
> `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`. The callback route handles both formats.

### 5. Create an administrator

Register through the app, then run this in the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

### 6. Run

```bash
npm run dev
```

Open http://localhost:3000. On a fresh database the seeded products have no photos; upload them from **Admin → Products → Edit**. The demo deployment's photos are openly licensed, and their sources are listed in [IMAGE_CREDITS.md](IMAGE_CREDITS.md).

## Payments

### Demo mode (no Paystack key)

If `PAYSTACK_SECRET_KEY` is unset or left as the placeholder, checkout still creates real orders but sends the customer to `/checkout/demo-pay`. That page offers **Simulate successful payment** and **Simulate failed payment**. Both outcomes go through the same idempotent `confirm_order_payment()` function and the same `/checkout/verify` page as real payments. The demo page and `POST /api/payments/demo` switch off automatically once a Paystack key is set.

### Paystack test mode

1. The checkout calls `POST /api/checkout`, which creates the order and returns a Paystack `authorization_url`.
2. The customer pays on Paystack's hosted page using a [test card](https://paystack.com/docs/payments/test-payments/), e.g. `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`.
3. Paystack redirects the customer to `/checkout/verify?reference=…`. The server calls Paystack's verify endpoint and records the result.
4. **Webhook (recommended in production):** In the Paystack dashboard, set the webhook URL to `https://<your-domain>/api/payments/webhook`. This confirms orders even if the customer closes the tab before the redirect.

## API

Every endpoint returns `{ "data": … }` on success or `{ "error": { "code", "message", "fields?" } }` on failure, with the matching HTTP status (400, 401, 403, 404, 409, 422, 502).

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create account |
| POST | `/api/auth/login` | public | Sign in (sets session cookie) |
| POST | `/api/auth/logout` | any | Sign out |
| POST | `/api/auth/forgot-password` | public | Email a reset link |
| POST | `/api/auth/reset-password` | signed in | Set a new password |
| GET | `/api/products` | public | List (`q`, `category`, `sort`, `page`, `pageSize`) |
| POST | `/api/products` | admin | Create product |
| GET / PATCH / DELETE | `/api/products/:id` | public / admin / admin | Read, update, delete |
| GET / POST | `/api/categories` | public / admin | List, create |
| PATCH / DELETE | `/api/categories/:id` | admin | Update, delete |
| GET / POST / DELETE | `/api/cart` | signed in | Get cart, add item, clear |
| PATCH / DELETE | `/api/cart/:productId` | signed in | Set quantity, remove |
| POST | `/api/cart/merge` | signed in | Merge a guest cart |
| POST | `/api/checkout` | signed in | Create order and start payment |
| GET | `/api/orders` | signed in | Own order history |
| GET | `/api/orders/:id` | owner/admin | Order with items |
| POST | `/api/orders/:id/pay` | owner | Retry payment for an unpaid order |
| GET | `/api/payments/verify?reference=` | public | Verify with Paystack and record (idempotent) |
| POST | `/api/payments/webhook` | Paystack (signed) | Payment events |
| POST | `/api/payments/demo` | order owner, demo mode only | Simulate a payment outcome (disabled when Paystack is configured) |
| GET | `/api/profile` · PATCH | signed in | Read / update profile |
| GET | `/api/admin/stats` | admin | Sales and inventory summary |
| GET | `/api/admin/orders` | admin | All orders (`status`, `q`, `page`) |
| PATCH | `/api/admin/orders/:id` | admin | Update order status |
| POST | `/api/admin/uploads` | admin | Upload a product image (multipart `file`, ≤ 5 MB) |

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run test:db     # applies the migration in PGlite and runs 36 checks on orders, payments and RLS
```

## Deployment (Vercel)

1. Push the repository to GitHub and import it in Vercel.
2. Add the environment variables (`PAYSTACK_SECRET_KEY` is optional), setting `NEXT_PUBLIC_SITE_URL` to the production URL.
3. Add the production `/auth/callback` URL to Supabase's redirect list, and set the Paystack webhook URL.
4. Deploy.

## Out of scope (v1)

Multi-vendor selling, reviews, wishlists, coupons, recommendations, live delivery tracking and native apps. See the PRD.
