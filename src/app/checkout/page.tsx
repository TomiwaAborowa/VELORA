import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { isPaystackConfigured } from "@/lib/paystack";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const profile = await requireProfile("/checkout");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title="Checkout" description={`Signed in as ${profile.email}`} />
      <CheckoutForm
        defaults={{ fullName: profile.full_name ?? "", phone: profile.phone ?? "" }}
        demoPayments={!isPaystackConfigured()}
      />
    </div>
  );
}
