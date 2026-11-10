"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { OrderSummary } from "@/components/order-summary";
import { ProductImage } from "@/components/product-image";
import { Alert, Button, buttonClasses, EmptyState, Field, fieldA11y, Input, Select, Skeleton, Textarea } from "@/components/ui";
import { useApiForm } from "@/components/use-api-form";
import { api } from "@/lib/client-api";
import { estimateShipping, NIGERIAN_STATES } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

type Defaults = { fullName: string; phone: string };

export function CheckoutForm({ defaults, demoPayments }: { defaults: Defaults; demoPayments: boolean }) {
  const { lines, subtotal, ready } = useCart();
  const { pending, error, fieldError, onSubmit } = useApiForm(async (values) => {
    const { authorizationUrl } = await api<{ authorizationUrl: string }>("/api/checkout", {
      method: "POST",
      json: values,
    });
    // Hand off to Paystack's hosted checkout.
    window.location.assign(authorizationUrl);
    // Keep the button busy while the browser navigates away.
    await new Promise(() => {});
  });

  if (!ready) return <Skeleton className="h-96" />;

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add some products before checking out."
        action={
          <Link href="/products" className={buttonClasses()}>
            Browse products
          </Link>
        }
      />
    );
  }

  const shipping = estimateShipping(subtotal);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <fieldset className="space-y-5" disabled={pending}>
        <legend className="mb-2 font-display text-xl font-medium">Delivery details</legend>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="fullName" label="Full name" error={fieldError("fullName")}>
            <Input {...fieldA11y("fullName", fieldError("fullName"))} defaultValue={defaults.fullName} autoComplete="name" required />
          </Field>
          <Field id="phone" label="Phone number" error={fieldError("phone")}>
            <Input {...fieldA11y("phone", fieldError("phone"))} defaultValue={defaults.phone} type="tel" autoComplete="tel" placeholder="+234 801 234 5678" required />
          </Field>
        </div>
        <Field id="address" label="Street address" error={fieldError("address")}>
          <Input {...fieldA11y("address", fieldError("address"))} autoComplete="street-address" required />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="city" label="City" error={fieldError("city")}>
            <Input {...fieldA11y("city", fieldError("city"))} autoComplete="address-level2" required />
          </Field>
          <Field id="state" label="State" error={fieldError("state")}>
            <Select {...fieldA11y("state", fieldError("state"))} defaultValue="" autoComplete="address-level1" required>
              <option value="" disabled>
                Select state
              </option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="postalCode" label="Postal code" optional error={fieldError("postalCode")}>
            <Input {...fieldA11y("postalCode", fieldError("postalCode"))} autoComplete="postal-code" />
          </Field>
        </div>
        <Field id="notes" label="Delivery notes" optional error={fieldError("notes")}>
          <Textarea {...fieldA11y("notes", fieldError("notes"))} rows={3} maxLength={300} placeholder="Landmarks, gate codes, preferred times…" />
        </Field>
      </fieldset>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <OrderSummary subtotal={subtotal} shipping={shipping} total={subtotal + shipping} estimate>
          <ul className="mb-6 space-y-3 border-b border-line pb-6">
            {lines.map((line) => (
              <li key={line.productId} className="flex items-center gap-3 text-sm">
                <ProductImage src={line.image} alt="" sizes="48px" className="size-12 shrink-0 rounded-lg" />
                <span className="flex-1">
                  {line.name} <span className="text-muted">× {line.quantity}</span>
                </span>
                <span>{formatPrice(line.price * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <Button type="submit" size="lg" loading={pending} className="w-full">
            <Lock className="size-4" aria-hidden /> {demoPayments ? "Place order" : "Pay with Paystack"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted">
            {demoPayments
              ? "Demo mode: you’ll confirm a simulated payment on the next page. No money is taken."
              : "You’ll be redirected to Paystack to complete payment securely."}
          </p>
        </OrderSummary>
      </div>
    </form>
  );
}
