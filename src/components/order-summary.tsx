import type { ReactNode } from "react";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

export function OrderSummary({
  subtotal,
  shipping,
  total,
  estimate,
  children,
}: {
  subtotal: number;
  shipping: number;
  total: number;
  estimate?: boolean;
  children?: ReactNode;
}) {
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  return (
    <section aria-labelledby="summary-heading" className="rounded-2xl border border-line bg-surface p-6">
      <h2 id="summary-heading" className="font-display text-xl font-medium">
        Order summary
      </h2>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Delivery</dt>
          <dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>
      {estimate && remaining > 0 && subtotal > 0 && (
        <p className="mt-4 rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">
          Add {formatPrice(remaining)} more for free delivery.
        </p>
      )}
      {estimate && <p className="mt-3 text-xs text-muted">Final total is confirmed at checkout.</p>}
      {children && <div className="mt-6">{children}</div>}
    </section>
  );
}
