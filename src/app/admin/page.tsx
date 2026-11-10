import type { Metadata } from "next";
import Link from "next/link";
import { OrdersTable } from "@/components/orders-table";
import { Card, PageHeader } from "@/components/ui";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { getAdminStats, listOrders } from "@/lib/data/orders";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { RevenueChart } from "./revenue-chart";

export const metadata: Metadata = { title: "Admin dashboard" };

async function getLowStock() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, stock")
    .eq("is_active", true)
    .lte("stock", LOW_STOCK_THRESHOLD)
    .order("stock")
    .limit(6);
  return (data ?? []) as { id: string; name: string; stock: number }[];
}

export default async function AdminDashboard() {
  const [stats, recent, lowStock] = await Promise.all([
    getAdminStats(),
    listOrders({ pageSize: 6 }),
    getLowStock(),
  ]);

  const tiles = [
    { label: "Revenue", value: formatPrice(stats.revenue), note: "Paid, excluding cancelled" },
    { label: "Paid orders", value: stats.paid_orders.toLocaleString(), note: `${stats.total_orders} placed in total` },
    { label: "To fulfil", value: stats.awaiting_fulfilment.toLocaleString(), note: "Paid and processing", href: "/admin/orders?status=processing" },
    { label: "Customers", value: stats.customers.toLocaleString(), note: `${stats.products} products listed` },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Sales, orders and inventory at a glance." />

      <dl className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-5">
            <dt className="text-sm text-muted">{tile.label}</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">
              {tile.href ? <Link href={tile.href} className="hover:underline">{tile.value}</Link> : tile.value}
            </dd>
            <dd className="mt-1 text-xs text-muted">{tile.note}</dd>
          </Card>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_300px]">
        <Card className="p-5">
          <RevenueChart days={stats.daily_revenue} />
        </Card>
        <Card className="p-5">
          <h2 className="font-medium">Low stock</h2>
          {lowStock.length > 0 ? (
            <ul className="mt-4 space-y-3 text-sm">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <Link href={`/admin/products/${p.id}/edit`} className="truncate hover:underline">{p.name}</Link>
                  <span className={p.stock === 0 ? "font-medium text-danger" : "font-medium text-warning"}>
                    {p.stock === 0 ? "Sold out" : `${p.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">All active products are well stocked.</p>
          )}
        </Card>
      </div>

      <section className="mt-10" aria-labelledby="recent-orders">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="recent-orders" className="font-display text-xl font-medium">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm font-medium text-accent hover:underline">View all</Link>
        </div>
        {recent.items.length > 0 ? (
          <OrdersTable orders={recent.items} hrefBase="/admin/orders" showCustomer />
        ) : (
          <p className="text-sm text-muted">No orders yet.</p>
        )}
      </section>
    </>
  );
}
