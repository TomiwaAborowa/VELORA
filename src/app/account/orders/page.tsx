import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { OrdersTable } from "@/components/orders-table";
import { Pagination } from "@/components/pagination";
import { buttonClasses, EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { listOrders } from "@/lib/data/orders";

export const metadata: Metadata = { title: "Order history" };

export default async function OrdersPage({ searchParams }: PageProps<"/account/orders">) {
  const profile = await requireProfile("/account/orders");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const result = await listOrders({ userId: profile.id, page, pageSize: 10 });

  return (
    <>
      <PageHeader title="Order history" description="Track and review everything you’ve ordered." />
      {result.items.length > 0 ? (
        <>
          <OrdersTable orders={result.items} hrefBase="/account/orders" />
          <Pagination page={page} pageCount={result.pageCount} basePath="/account/orders" params={{}} />
        </>
      ) : (
        <EmptyState
          icon={<Package className="size-6" aria-hidden />}
          title="No orders yet"
          description="When you place an order, it will appear here."
          action={<Link href="/products" className={buttonClasses()}>Start shopping</Link>}
        />
      )}
    </>
  );
}
