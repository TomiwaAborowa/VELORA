"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { Select } from "@/components/ui";
import { PRODUCT_SORTS } from "@/lib/constants";
import type { Category } from "@/lib/types";

export function CatalogueControls({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // filters reset pagination
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <form
        role="search"
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
        }}
      >
        <label htmlFor="catalogue-search" className="mb-1.5 block text-sm font-medium">
          Search
        </label>
        <Search className="pointer-events-none absolute bottom-3.5 left-3.5 size-4 text-muted" aria-hidden />
        <input
          id="catalogue-search"
          name="q"
          type="search"
          key={searchParams.get("q") ?? ""}
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="Search by product name"
          className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </form>
      <div className="grid grid-cols-2 gap-3 sm:flex">
        <div>
          <label htmlFor="catalogue-category" className="mb-1.5 block text-sm font-medium">
            Category
          </label>
          <Select
            id="catalogue-category"
            value={searchParams.get("category") ?? ""}
            onChange={(e) => update({ category: e.target.value })}
            className="sm:w-48"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="catalogue-sort" className="mb-1.5 block text-sm font-medium">
            Sort by
          </label>
          <Select
            id="catalogue-sort"
            value={searchParams.get("sort") ?? "newest"}
            onChange={(e) => update({ sort: e.target.value === "newest" ? "" : e.target.value })}
            className="sm:w-48"
          >
            {Object.entries(PRODUCT_SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="hidden h-11 w-5 items-center sm:flex" aria-live="polite">
        {pending && <Loader2 className="size-4 animate-spin text-muted" aria-label="Updating results" />}
      </div>
    </div>
  );
}
