import { SectionNav } from "@/components/section-nav";
import { requireAdminProfile } from "@/lib/auth";

// Every admin page is gated here; the API and RLS enforce the same rule.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdminProfile();

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[200px_1fr] lg:gap-12">
      <aside>
        <p className="mb-3 hidden px-4 text-xs font-semibold uppercase tracking-wider text-muted lg:block">Admin</p>
        <SectionNav
          label="Admin"
          links={[
            { href: "/admin", label: "Dashboard", exact: true },
            { href: "/admin/products", label: "Products" },
            { href: "/admin/categories", label: "Categories" },
            { href: "/admin/orders", label: "Orders" },
          ]}
        />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
