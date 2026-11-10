"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

export function DemoPayButtons({ reference }: { reference: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"success" | "failed" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(outcome: "success" | "failed") {
    setPending(outcome);
    setError(null);
    try {
      await api("/api/payments/demo", { method: "POST", json: { reference, outcome } });
      // Same landing page Paystack redirects to.
      router.push(`/checkout/verify?reference=${encodeURIComponent(reference)}`);
    } catch (e) {
      setError(errorMessage(e));
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}
      <Button size="lg" className="w-full" loading={pending === "success"} disabled={pending !== null} onClick={() => submit("success")}>
        Simulate successful payment
      </Button>
      <Button
        size="lg"
        variant="secondary"
        className="w-full"
        loading={pending === "failed"}
        disabled={pending !== null}
        onClick={() => submit("failed")}
      >
        Simulate failed payment
      </Button>
    </div>
  );
}
