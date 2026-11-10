"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Sub-navigation for the account and admin areas. */
export function SectionNav({ label, links }: { label: string; links: { href: string; label: string; exact?: boolean }[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium lg:rounded-xl",
                  active ? "bg-ink text-white" : "text-ink/80 hover:bg-sand",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
