import { SignOutButton } from "@/components/header-client";
import { SectionNav } from "@/components/section-nav";
import { requireProfile } from "@/lib/auth";

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  await requireProfile("/account");

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr] lg:gap-12">
      <aside className="space-y-4">
        <SectionNav
          label="Account"
          links={[
            { href: "/account", label: "Overview", exact: true },
            { href: "/account/orders", label: "Orders" },
            { href: "/account/profile", label: "Profile settings" },
          ]}
        />
        <SignOutButton className="hidden px-4 py-2 text-sm font-medium text-muted hover:text-ink lg:inline-flex" />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
