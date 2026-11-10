import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader title="Your cart" />
      <CartView />
    </div>
  );
}
