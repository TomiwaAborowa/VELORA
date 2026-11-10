import Link from "next/link";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import type { Order } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";

/** Responsive order list: a table on wide screens, cards on mobile. */
export function OrdersTable({ orders, hrefBase, showCustomer }: { orders: Order[]; hrefBase: string; showCustomer?: boolean }) {
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <Link href={`${hrefBase}/${order.id}`} className="block rounded-2xl border border-line bg-surface p-4 hover:border-ink/30">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{order.order_number}</span>
                <span className="font-medium">{formatPrice(order.total)}</span>
              </div>
              {showCustomer && <p className="mt-1 text-sm text-muted">{order.shipping_name}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.payment_status} />
                <span className="ml-auto">{formatDate(order.created_at)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-sand/50 text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Order</th>
              {showCustomer && <th scope="col" className="px-4 py-3 font-medium">Customer</th>}
              <th scope="col" className="px-4 py-3 font-medium">Date</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Payment</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-sand/40">
                <td className="px-4 py-3">
                  <Link href={`${hrefBase}/${order.id}`} className="font-medium text-accent hover:underline">
                    {order.order_number}
                  </Link>
                </td>
                {showCustomer && (
                  <td className="px-4 py-3">
                    <div>{order.shipping_name}</div>
                    <div className="text-muted">{order.email}</div>
                  </td>
                )}
                <td className="px-4 py-3 text-muted">{formatDate(order.created_at)}</td>
                <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                <td className="px-4 py-3"><PaymentStatusBadge status={order.payment_status} /></td>
                <td className="px-4 py-3 text-right font-medium">{formatPrice(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
