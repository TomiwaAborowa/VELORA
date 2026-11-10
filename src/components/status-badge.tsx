import { Badge } from "@/components/ui";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

const orderStyles: Record<OrderStatus, string> = {
  pending: "bg-warning-soft text-warning",
  processing: "bg-info-soft text-info",
  shipped: "bg-accent-soft text-accent",
  delivered: "bg-success-soft text-success",
  cancelled: "bg-sand text-muted",
};

const paymentStyles: Record<PaymentStatus, string> = {
  unpaid: "bg-sand text-muted",
  paid: "bg-success-soft text-success",
  failed: "bg-danger-soft text-danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={orderStyles[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge className={paymentStyles[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
