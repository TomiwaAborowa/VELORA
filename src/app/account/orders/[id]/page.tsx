import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { OrderDetail } from "@/components/order-detail";
import { requireProfile } from "@/lib/auth";
import { getOrder } from "@/lib/data/orders";
import { PayOrderButton } from "./pay-order-button";

export const metadata: Metadata = { title: "Order details" };

export default async function OrderPage({ params }: PageProps<"/account/orders/[id]">) {
  const profile = await requireProfile("/account/orders");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const order = await getOrder(id.data);
  // RLS already restricts this; the extra check keeps admins' own view scoped too.
  if (!order || order.user_id !== profile.id) notFound();

  const canPay = order.status === "pending" && order.payment_status !== "paid";

  return (
    <>
      <Link href="/account/orders" className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All orders
      </Link>
      <OrderDetail order={order} actions={canPay ? <PayOrderButton orderId={order.id} /> : undefined} />
    </>
  );
}
