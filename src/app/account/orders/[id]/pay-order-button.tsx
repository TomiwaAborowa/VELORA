"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

export function PayOrderButton({ orderId }: { orderId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPending(true);
    setError(null);
    try {
      const { authorizationUrl } = await api<{ authorizationUrl: string }>(`/api/orders/${orderId}/pay`, { method: "POST" });
      window.location.assign(authorizationUrl);
    } catch (e) {
      setError(errorMessage(e));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={pay} loading={pending}>
        <Lock className="size-4" aria-hidden /> Complete payment
      </Button>
      {error && <p role="alert" className="max-w-xs text-right text-sm text-danger">{error}</p>}
      <p className="text-xs text-muted">Unpaid orders are released after 60 minutes.</p>
    </div>
  );
}
