"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/add-to-cart";
import { useCart } from "@/components/cart-provider";
import { OrderSummary } from "@/components/order-summary";
import { ProductImage } from "@/components/product-image";
import { Alert, buttonClasses, EmptyState, Skeleton } from "@/components/ui";
import { errorMessage } from "@/lib/client-api";
import { estimateShipping, MAX_CART_QUANTITY } from "@/lib/constants";
import type { CartLine } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function CartView() {
  const { lines, subtotal, ready, isAuthenticated } = useCart();
  const [error, setError] = useState<string | null>(null);

  if (!ready) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading cart">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-6" aria-hidden />}
        title="Your cart is empty"
        description="Browse the collection and add something you love."
        action={
          <Link href="/products" className={buttonClasses()}>
            Start shopping
          </Link>
        }
      />
    );
  }

  const shipping = estimateShipping(subtotal);
  const hasProblems = lines.some((l) => !l.isActive || l.quantity > l.stock);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        {error && (
          <Alert tone="error" className="mb-4">
            {error}
          </Alert>
        )}
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => (
            <CartRow key={line.productId} line={line} onError={setError} />
          ))}
        </ul>
      </div>
      <div className="lg:sticky lg:top-24 lg:self-start">
        <OrderSummary subtotal={subtotal} shipping={shipping} total={subtotal + shipping} estimate>
          {hasProblems && (
            <Alert tone="warning" className="mb-4">
              Some items need attention before you can check out.
            </Alert>
          )}
          {hasProblems ? (
            <span className={buttonClasses({ size: "lg", className: "w-full opacity-50" })} aria-disabled>
              Proceed to checkout
            </span>
          ) : (
            <Link
              href={isAuthenticated ? "/checkout" : "/login?next=/checkout"}
              className={buttonClasses({ size: "lg", className: "w-full" })}
            >
              {isAuthenticated ? "Proceed to checkout" : "Sign in to check out"}
            </Link>
          )}
          <Link href="/products" className="mt-3 block text-center text-sm font-medium text-accent hover:underline">
            Continue shopping
          </Link>
        </OrderSummary>
      </div>
    </div>
  );
}

function CartRow({ line, onError }: { line: CartLine; onError: (message: string | null) => void }) {
  const { setQuantity, remove } = useCart();
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>) {
    setPending(true);
    onError(null);
    try {
      await action();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  const problem = !line.isActive
    ? "No longer available"
    : line.stock === 0
      ? "Out of stock"
      : line.quantity > line.stock
        ? `Only ${line.stock} available`
        : null;

  return (
    <li className="flex gap-4 py-5" aria-busy={pending || undefined}>
      <Link href={`/products/${line.slug}`} className="shrink-0">
        <ProductImage src={line.image} alt={line.name} sizes="96px" className="size-24 rounded-xl" />
      </Link>
      <div className="flex flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <Link href={`/products/${line.slug}`} className="font-medium hover:underline">
            {line.name}
          </Link>
          <p className="mt-1 text-sm text-muted">{formatPrice(line.price)} each</p>
          {problem && <p className="mt-1 text-sm font-medium text-danger">{problem}</p>}
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <QuantityStepper
            label={`Quantity for ${line.name}`}
            value={line.quantity}
            max={Math.min(Math.max(line.stock, 1), MAX_CART_QUANTITY)}
            disabled={pending}
            onChange={(quantity) => run(() => setQuantity(line.productId, quantity))}
          />
          <p className="w-24 text-right font-medium">{formatPrice(line.price * line.quantity)}</p>
          <button
            type="button"
            onClick={() => run(() => remove(line.productId))}
            disabled={pending}
            className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-sand hover:text-danger"
            aria-label={`Remove ${line.name} from cart`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}
