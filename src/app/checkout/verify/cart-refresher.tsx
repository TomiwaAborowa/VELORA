"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart-provider";

/** Purchased items are removed from the cart server-side; resync the badge. */
export function CartRefresher() {
  const { reload } = useCart();
  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);
  return null;
}
