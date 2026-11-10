import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { requireProfile } from "@/lib/auth";
import { verifyAndRecordPayment, type VerificationResult } from "@/lib/payments";
import { formatPrice } from "@/lib/utils";
import { CartRefresher } from "./cart-refresher";

export const metadata: Metadata = { title: "Payment status" };

/**
 * Paystack redirects here with ?reference=…  The payment is verified
 * server-side with Paystack before the order is marked as paid.
 */
export default async function VerifyPaymentPage({ searchParams }: PageProps<"/checkout/verify">) {
  const profile = await requireProfile("/account/orders");
  const params = await searchParams;
  const reference = typeof params.reference === "string" ? params.reference : null;

  let result: VerificationResult | null = null;
  let failure: string | null = null;

  if (!reference || !/^[A-Za-z0-9-]{6,80}$/.test(reference)) {
    failure = "This payment link is missing a valid reference.";
  } else {
    try {
      result = await verifyAndRecordPayment(reference);
    } catch (error) {
      failure = error instanceof ApiError ? error.message : "We couldn’t verify your payment right now.";
    }
  }

  // Only show order details to the order's owner.
  const order = result?.order && result.order.user_id === profile.id ? result.order : null;

  if (result?.status === "paid" && order) {
    return (
      <Shell icon={<CheckCircle2 className="size-12 text-success" aria-hidden />} title="Thank you — payment received">
        <CartRefresher />
        <p className="text-muted">
          Order <strong className="text-ink">{order.order_number}</strong> for {formatPrice(order.total)} is confirmed.
          We’ll email {order.email} when it ships.
        </p>
        {order.status === "cancelled" && (
          <p className="mt-4 text-sm text-danger">
            Unfortunately an item sold out while you were paying. Our team will contact you about a full refund.
          </p>
        )}
        <Actions orderId={order.id} />
      </Shell>
    );
  }

  if (result?.status === "pending") {
    return (
      <Shell icon={<Clock className="size-12 text-warning" aria-hidden />} title="Payment processing">
        <p className="text-muted">{result.message} Refresh this page in a moment, or check your orders.</p>
        <Actions orderId={order?.id} />
      </Shell>
    );
  }

  return (
    <Shell icon={<XCircle className="size-12 text-danger" aria-hidden />} title="Payment not completed">
      <p className="text-muted">
        {result && result.status === "failed"
          ? `${result.message} You can retry payment from your order.`
          : `${failure ?? "We couldn’t verify your payment."} If you were charged, your order will update automatically once Paystack confirms it.`}
      </p>
      <Actions orderId={order?.id} retry />
    </Shell>
  );
}

function Shell({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      {icon}
      <h1 className="mt-6 font-display text-3xl font-medium">{title}</h1>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Actions({ orderId, retry }: { orderId?: string; retry?: boolean }) {
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {orderId && (
        <Link href={`/account/orders/${orderId}`} className={buttonClasses()}>
          {retry ? "Retry payment" : "View order"}
        </Link>
      )}
      <Link href="/products" className={buttonClasses({ variant: "secondary" })}>
        Continue shopping
      </Link>
    </div>
  );
}
