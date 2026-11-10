import type { ReactNode } from "react";
import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui";
import type { OrderStatus, OrderWithItems } from "@/lib/types";
import { cn, formatDate, formatPrice } from "@/lib/utils";

const STEPS: OrderStatus[] = ["pending", "processing", "shipped", "delivered"];
const STEP_LABELS: Record<string, string> = {
  pending: "Placed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

function Progress({ status }: { status: OrderStatus }) {
  if (status === "cancelled") return null;
  const current = STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
      {STEPS.map((step, index) => (
        <li key={step} aria-current={index === current ? "step" : undefined}>
          <div className={cn("h-1.5 rounded-full", index <= current ? "bg-accent" : "bg-line")} />
          <p className={cn("mt-2 text-xs", index <= current ? "font-medium text-ink" : "text-muted")}>{STEP_LABELS[step]}</p>
        </li>
      ))}
    </ol>
  );
}

export function OrderDetail({ order, actions, admin }: { order: OrderWithItems; actions?: ReactNode; admin?: boolean }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight">Order {order.order_number}</h1>
          <p className="mt-1 text-sm text-muted">Placed {formatDate(order.created_at, true)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.payment_status} />
          </div>
        </div>
        {actions}
      </div>

      <Card className="p-5">
        <Progress status={order.status} />
        {order.status === "cancelled" && (
          <p className="text-sm text-muted">This order was cancelled.{order.admin_note && admin ? ` ${order.admin_note}` : ""}</p>
        )}
        {admin && order.admin_note && order.status !== "cancelled" && (
          <p className="mt-4 text-sm text-warning">{order.admin_note}</p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h2 className="border-b border-line px-5 py-4 font-medium">Items</h2>
          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                <ProductImage src={item.product_image} alt="" sizes="64px" className="size-16 shrink-0 rounded-xl" />
                <div className="flex-1">
                  {item.product_slug && !admin ? (
                    <Link href={`/products/${item.product_slug}`} className="font-medium hover:underline">
                      {item.product_name}
                    </Link>
                  ) : (
                    <p className="font-medium">{item.product_name}</p>
                  )}
                  <p className="text-sm text-muted">
                    {formatPrice(item.unit_price)} × {item.quantity}
                  </p>
                </div>
                <p className="font-medium">{formatPrice(item.line_total)}</p>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-line px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd>{Number(order.shipping_fee) === 0 ? "Free" : formatPrice(order.shipping_fee)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 text-sm">
            <h2 className="mb-3 font-medium">Delivery address</h2>
            <address className="space-y-0.5 not-italic text-ink/80">
              <p className="font-medium text-ink">{order.shipping_name}</p>
              <p>{order.shipping_address}</p>
              <p>
                {order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}
              </p>
              <p>{order.shipping_phone}</p>
              <p>{order.email}</p>
            </address>
            {order.delivery_notes && (
              <p className="mt-3 rounded-lg bg-sand/60 p-3 text-ink/80">{order.delivery_notes}</p>
            )}
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="mb-3 font-medium">Payment</h2>
            <dl className="space-y-1.5">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Method</dt>
                <dd>Paystack</dd>
              </div>
              {order.paid_at && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Paid</dt>
                  <dd>{formatDate(order.paid_at, true)}</dd>
                </div>
              )}
              {admin && order.payment_reference && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Reference</dt>
                  <dd className="truncate font-mono text-xs">{order.payment_reference}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
