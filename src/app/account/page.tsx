import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { OrdersTable } from "@/components/orders-table";
import { Alert, buttonClasses, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { listOrders } from "@/lib/data/orders";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const profile = await requireProfile();
  const params = await searchParams;
  const { items: orders, total } = await listOrders({ userId: profile.id, pageSize: 5 });

  return (
    <>
      <PageHeader
        title={`Hello${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description="Manage your orders and account details."
      />

      {params.reset === "1" && <Alert tone="success" className="mb-6">Your password has been updated.</Alert>}
      {params.denied === "admin" && (
        <Alert tone="warning" className="mb-6">That area is only available to store administrators.</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted">Account details</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div><dt className="sr-only">Name</dt><dd className="font-medium">{profile.full_name ?? "—"}</dd></div>
            <div><dt className="sr-only">Email</dt><dd>{profile.email}</dd></div>
            <div><dt className="sr-only">Phone</dt><dd>{profile.phone ?? "No phone number added"}</dd></div>
            <div><dt className="sr-only">Member since</dt><dd className="text-muted">Member since {formatDate(profile.created_at)}</dd></div>
          </dl>
          <Link href="/account/profile" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
            Edit profile
          </Link>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted">Orders</h2>
          <p className="mt-3 font-display text-4xl font-medium">{total}</p>
          <p className="text-sm text-muted">{total === 1 ? "order placed" : "orders placed"}</p>
          <Link href="/account/orders" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
            View order history
          </Link>
        </Card>
      </div>

      <section className="mt-10" aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="mb-4 font-display text-xl font-medium">Recent orders</h2>
        {orders.length > 0 ? (
          <OrdersTable orders={orders} hrefBase="/account/orders" />
        ) : (
          <EmptyState
            icon={<Package className="size-6" aria-hidden />}
            title="No orders yet"
            description="When you place an order, it will appear here."
            action={<Link href="/products" className={buttonClasses()}>Start shopping</Link>}
          />
        )}
      </section>
    </>
  );
}
