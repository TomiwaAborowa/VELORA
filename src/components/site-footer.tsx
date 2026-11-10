import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-sand/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl font-semibold">Velora</p>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Considered goods for everyday living. Delivered across Nigeria, with free delivery on orders over ₦50,000.
          </p>
        </div>
        <nav aria-label="Shop">
          <h2 className="text-sm font-semibold">Shop</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/products" className="hover:text-ink">All products</Link></li>
            <li><Link href="/products?sort=newest" className="hover:text-ink">New arrivals</Link></li>
            <li><Link href="/cart" className="hover:text-ink">Cart</Link></li>
          </ul>
        </nav>
        <nav aria-label="Account">
          <h2 className="text-sm font-semibold">Account</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/account" className="hover:text-ink">My account</Link></li>
            <li><Link href="/account/orders" className="hover:text-ink">Order history</Link></li>
            <li><Link href="/account/profile" className="hover:text-ink">Profile settings</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} Velora. Payments secured by Paystack (test mode).
      </div>
    </footer>
  );
}
