import Link from "next/link";
import { Search, User } from "lucide-react";
import { CartLink, MobileMenu } from "@/components/header-client";
import type { Profile } from "@/lib/types";

export function SiteHeader({ profile }: { profile: Profile | null }) {
  const links = [
    { href: "/products", label: "Shop all" },
    ...(profile ? [{ href: "/account", label: "My account" }] : [{ href: "/login", label: "Sign in" }]),
    ...(profile?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <MobileMenu links={links} signedIn={Boolean(profile)} />

        <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
          Velora
        </Link>

        <nav aria-label="Main" className="ml-6 hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/products" className="text-ink/80 hover:text-ink">
            Shop all
          </Link>
          {profile?.role === "admin" && (
            <Link href="/admin" className="text-ink/80 hover:text-ink">
              Admin
            </Link>
          )}
        </nav>

        <form action="/products" role="search" className="relative ml-auto hidden w-full max-w-xs md:block">
          <label htmlFor="header-search" className="sr-only">
            Search products
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="header-search"
            name="q"
            type="search"
            placeholder="Search products"
            className="h-10 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm focus:border-accent focus:outline-none"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <Link
            href={profile ? "/account" : "/login"}
            className="hidden size-10 items-center justify-center rounded-full hover:bg-sand md:inline-flex"
            aria-label={profile ? "My account" : "Sign in"}
          >
            <User className="size-5" aria-hidden />
          </Link>
          <CartLink />
        </div>
      </div>
    </header>
  );
}
