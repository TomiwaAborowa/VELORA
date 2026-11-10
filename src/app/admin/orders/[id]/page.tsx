import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { OrderDetail } from "@/components/order-detail";
import { getOrder } from "@/lib/data/orders";
import { OrderStatusForm } from "./order-status-form";

export const metadata: Metadata = { title: "Order · Admin" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const order = await getOrder(id.data);
  if (!order) notFound();

  return (
    <>
      <Link href="/admin/orders" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All orders
      </Link>
      <OrderDetail
        order={order}
        admin
        actions={<OrderStatusForm orderId={order.id} status={order.status} paid={order.payment_status === "paid"} />}
      />
    </>
  );
}
