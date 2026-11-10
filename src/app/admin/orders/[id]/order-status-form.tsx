"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Select } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";

/** Statuses an admin may move an order to (mirrors admin_update_order_status). */
function nextStatuses(status: OrderStatus, paid: boolean): OrderStatus[] {
  if (status === "cancelled" || status === "delivered") return [];
  const fulfilment: OrderStatus[] = paid ? ["processing", "shipped", "delivered"] : [];
  return [...fulfilment.filter((s) => s !== status), "cancelled"];
}

export function OrderStatusForm({ orderId, status, paid }: { orderId: string; status: OrderStatus; paid: boolean }) {
  const router = useRouter();
  const options = nextStatuses(status, paid);
  const [value, setValue] = useState<OrderStatus | "">("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value) return;
    if (value === "cancelled" && !window.confirm("Cancel this order? Reserved stock will be returned to inventory.")) return;
    setPending(true);
    setError(null);
    try {
      await api(`/api/admin/orders/${orderId}`, { method: "PATCH", json: { status: value } });
      setValue("");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <label htmlFor="order-status" className="sr-only">Update status</label>
        <Select id="order-status" value={value} onChange={(e) => setValue(e.target.value as OrderStatus)} className="w-44">
          <option value="" disabled>Update status…</option>
          {options.map((s) => (
            <option key={s} value={s}>{s === "cancelled" ? "Cancel order" : `Mark ${ORDER_STATUS_LABELS[s].toLowerCase()}`}</option>
          ))}
        </Select>
        <Button type="submit" loading={pending} disabled={!value}>Update</Button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}
