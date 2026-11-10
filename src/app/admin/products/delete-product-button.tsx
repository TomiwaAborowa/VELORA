"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";

export function DeleteProductButton({ id, name, redirectTo }: { id: string; name: string; redirectTo?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete “${name}”? Past orders keep their record of it, but this cannot be undone.`)) return;
    setPending(true);
    try {
      await api(`/api/products/${id}`, { method: "DELETE" });
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      window.alert(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} loading={pending} className="text-danger hover:bg-danger-soft">
      Delete<span className="sr-only"> {name}</span>
    </Button>
  );
}
