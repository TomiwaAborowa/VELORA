import Link from "next/link";
import { buttonClasses } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-3 font-display text-4xl font-medium">We couldn’t find that page</h1>
      <p className="mt-4 text-muted">It may have moved, or the product is no longer available.</p>
      <Link href="/products" className={buttonClasses({ className: "mt-8" })}>
        Continue shopping
      </Link>
    </div>
  );
}
