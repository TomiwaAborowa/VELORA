import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { CatalogueControls } from "@/components/catalogue-controls";
import { Pagination } from "@/components/pagination";
import { ProductGrid } from "@/components/product-card";
import { buttonClasses, EmptyState } from "@/components/ui";
import { PRODUCTS_PAGE_SIZE } from "@/lib/constants";
import { listCategories, listProducts } from "@/lib/data/products";
import { productQuerySchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Shop all products" };

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const query = productQuerySchema.parse({ ...(await searchParams), pageSize: PRODUCTS_PAGE_SIZE });
  const [result, categories] = await Promise.all([listProducts(query), listCategories()]);
  const activeCategory = categories.find((c) => c.slug === query.category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {activeCategory?.name ?? "All products"}
        </h1>
        <p className="mt-2 text-muted">
          {activeCategory?.description ?? "Everything in the Velora collection."}
        </p>
      </div>

      <CatalogueControls categories={categories} />

      <p className="mb-6 mt-8 text-sm text-muted" aria-live="polite">
        {result.total} {result.total === 1 ? "product" : "products"}
        {query.q && <> matching “{query.q}”</>}
      </p>

      {result.items.length > 0 ? (
        <>
          <ProductGrid products={result.items} />
          <Pagination
            page={query.page}
            pageCount={result.pageCount}
            basePath="/products"
            params={{ q: query.q, category: query.category, sort: query.sort === "newest" ? undefined : query.sort }}
          />
        </>
      ) : (
        <EmptyState
          icon={<SearchX className="size-6" aria-hidden />}
          title="No products found"
          description="Try a different search term or browse all categories."
          action={
            <Link href="/products" className={buttonClasses({ variant: "secondary" })}>
              Clear filters
            </Link>
          }
        />
      )}
    </div>
  );
}
