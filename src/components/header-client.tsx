"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LogOut, Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link
      href="/cart"
      className="relative inline-flex size-10 items-center justify-center rounded-full hover:bg-sand"
      aria-label={ready ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart"}
    >
      <ShoppingBag className="size-5" aria-hidden />
      {ready && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={cn("inline-flex items-center gap-2", className)}
      onClick={() =>
        startTransition(async () => {
          await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
          router.push("/");
          router.refresh();
        })
      }
    >
      <LogOut className="size-4" aria-hidden />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

type NavLink = { href: string; label: string };

export function MobileMenu({ links, signedIn }: { links: NavLink[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu after navigating.
  useEffect(() => {
    setOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sand"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {open && (
        <nav id="mobile-menu" className="absolute inset-x-0 top-full border-b border-line bg-paper px-4 pb-6 pt-2 shadow-sm">
          <form action="/products" className="mb-3">
            <label htmlFor="mobile-search" className="sr-only">
              Search products
            </label>
            <input
              id="mobile-search"
              name="q"
              type="search"
              placeholder="Search products"
              className="h-11 w-full rounded-full border border-line bg-surface px-4 text-sm"
            />
          </form>
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block rounded-xl px-3 py-2.5 font-medium hover:bg-sand">
                  {link.label}
                </Link>
              </li>
            ))}
            {signedIn ? (
              <li>
                <SignOutButton className="w-full rounded-xl px-3 py-2.5 font-medium hover:bg-sand" />
              </li>
            ) : (
              <li>
                <Link href="/register" className="block rounded-xl px-3 py-2.5 font-medium hover:bg-sand">
                  Create account
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </div>
  );
}
