"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { Alert, Button } from "@/components/ui";
import { errorMessage } from "@/lib/client-api";
import { MAX_CART_QUANTITY } from "@/lib/constants";
import type { CartLine } from "@/lib/types";

export function QuantityStepper({
  value,
  max,
  onChange,
  disabled,
  label,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label: string;
}) {
  const button = "inline-flex size-10 items-center justify-center rounded-full hover:bg-sand disabled:text-muted/40 disabled:hover:bg-transparent";
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface" role="group" aria-label={label}>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function AddToCart({ product }: { product: Omit<CartLine, "quantity"> }) {
  const { add, lines } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const inCart = lines.find((l) => l.productId === product.productId)?.quantity ?? 0;
  const available = Math.min(product.stock - inCart, MAX_CART_QUANTITY - inCart);

  if (product.stock === 0) {
    return (
      <Button size="lg" disabled className="w-full sm:w-auto">
        Sold out
      </Button>
    );
  }

  async function handleAdd() {
    setPending(true);
    setError(null);
    try {
      await add(product, quantity);
      setAdded(true);
      setQuantity(1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          label="Quantity"
          value={quantity}
          max={Math.max(available, 1)}
          onChange={(v) => {
            setQuantity(v);
            setAdded(false);
          }}
          disabled={available <= 0}
        />
        <Button size="lg" onClick={handleAdd} loading={pending} disabled={available <= 0} className="flex-1 sm:flex-none">
          {available <= 0 ? "Maximum in cart" : "Add to cart"}
        </Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {added && !error && (
        <Alert tone="success">
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <Check className="sr-only" aria-hidden /> Added to your cart.
            <Link href="/cart" className="font-medium underline">
              View cart
            </Link>
          </span>
        </Alert>
      )}
    </div>
  );
}
