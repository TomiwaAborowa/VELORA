import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Card } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { isPaystackConfigured } from "@/lib/paystack";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { DemoPayButtons } from "./demo-pay-buttons";

export const metadata: Metadata = { title: "Demo payment" };

/** Stand-in for Paystack's hosted checkout while no Paystack key is set. */
export default async function DemoPayPage({ searchParams }: PageProps<"/checkout/demo-pay">) {
  if (isPaystackConfigured()) notFound();
  await requireProfile("/account/orders");

  const reference = (await searchParams).reference;
  if (typeof reference !== "string" || !/^[A-Za-z0-9-]{6,80}$/.test(reference)) notFound();

  // RLS limits this to the signed-in customer's own orders.
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, total, email, status, payment_status")
    .eq("payment_reference", reference)
    .maybeSingle();
  const order = data as Pick<Order, "id" | "order_number" | "total" | "email" | "status" | "payment_status"> | null;
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 flex items-start gap-3 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning" role="note">
        <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong>Demo payment mode.</strong> Paystack isn’t configured, so no real payment is taken. Add a
          <code className="mx-1">PAYSTACK_SECRET_KEY</code>to use Paystack instead.
        </p>
      </div>
      <Card className="p-6 sm:p-8">
        <p className="text-sm text-muted">Paying for order</p>
        <h1 className="mt-1 font-display text-2xl font-medium">{order.order_number}</h1>
        <dl className="mt-6 space-y-2 border-y border-line py-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Email</dt>
            <dd>{order.email}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Amount</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
        </dl>
        <div className="mt-6">
          {order.payment_status === "paid" || order.status !== "pending" ? (
            <p className="text-sm text-muted">This order can no longer be paid.</p>
          ) : (
            <DemoPayButtons reference={reference} />
          )}
        </div>
      </Card>
    </div>
  );
}
