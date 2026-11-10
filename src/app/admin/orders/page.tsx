import type { Metadata } from "next";
import Link from "next/link";
import { OrdersTable } from "@/components/orders-table";
import { Pagination } from "@/components/pagination";
import { EmptyState, PageHeader } from "@/components/ui";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { listOrders } from "@/lib/data/orders";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders · Admin" };

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.status);
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await listOrders({ status, q, page, pageSize: 20 });

  const filterHref = (s?: OrderStatus) => {
    const search = new URLSearchParams();
    if (s) search.set("status", s);
    if (q) search.set("q", q);
    const qs = search.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  return (
    <>
      <PageHeader title="Orders" description={`${result.total} ${result.total === 1 ? "order" : "orders"}`} />

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <nav aria-label="Filter by status" className="-mx-4 overflow-x-auto px-4">
          <ul className="flex gap-2">
            {[undefined, ...STATUSES].map((s) => (
              <li key={s ?? "all"}>
                <Link
                  href={filterHref(s)}
                  aria-current={s === status ? "page" : undefined}
                  className={cn(
                    "block whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm",
                    s === status ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink/40",
                  )}
                >
                  {s ? ORDER_STATUS_LABELS[s] : "All"}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form role="search" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="order-search" className="sr-only">Search orders</label>
          <input
            id="order-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Order number, name or email"
            className="h-10 w-full rounded-full border border-line bg-surface px-4 text-sm focus:border-accent focus:outline-none xl:w-72"
          />
        </form>
      </div>

      {result.items.length > 0 ? (
        <>
          <OrdersTable orders={result.items} hrefBase="/admin/orders" showCustomer />
          <Pagination page={page} pageCount={result.pageCount} basePath="/admin/orders" params={{ status, q }} />
        </>
      ) : (
        <EmptyState title="No orders found" description="Orders matching these filters will appear here." />
      )}
    </>
  );
}
