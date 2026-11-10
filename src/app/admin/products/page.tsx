import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { ProductImage } from "@/components/product-image";
import { Badge, buttonClasses, EmptyState, PageHeader } from "@/components/ui";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { listProducts } from "@/lib/data/products";
import { formatPrice } from "@/lib/utils";
import { productQuerySchema } from "@/lib/validation";
import { DeleteProductButton } from "./delete-product-button";

export const metadata: Metadata = { title: "Products · Admin" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const query = productQuerySchema.parse({ ...(await searchParams), pageSize: 20 });
  const result = await listProducts({ ...query, includeInactive: true });

  return (
    <>
      <PageHeader
        title="Products"
        description={`${result.total} ${result.total === 1 ? "product" : "products"}`}
        action={
          <Link href="/admin/products/new" className={buttonClasses()}>
            <Plus className="size-4" aria-hidden /> New product
          </Link>
        }
      />

      <form role="search" className="mb-6 flex max-w-md gap-2">
        <label htmlFor="admin-product-search" className="sr-only">Search products</label>
        <input
          id="admin-product-search"
          name="q"
          type="search"
          defaultValue={query.q}
          placeholder="Search by name"
          className="h-10 flex-1 rounded-full border border-line bg-surface px-4 text-sm focus:border-accent focus:outline-none"
        />
        <button type="submit" className={buttonClasses({ variant: "secondary", size: "sm", className: "h-10" })}>
          Search
        </button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          title="No products found"
          description={query.q ? "Try a different search." : "Create your first product to start selling."}
          action={<Link href="/admin/products/new" className={buttonClasses()}>New product</Link>}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-sand/50 text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Product</th>
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Stock</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.items.map((product) => (
                <tr key={product.id} className="hover:bg-sand/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductImage src={product.images[0]} alt="" sizes="40px" className="size-10 shrink-0 rounded-lg" />
                      <Link href={`/admin/products/${product.id}/edit`} className="font-medium hover:underline">
                        {product.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{product.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(product.price)}</td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      product.stock === 0 ? "font-medium text-danger" : product.stock <= LOW_STOCK_THRESHOLD ? "font-medium text-warning" : ""
                    }`}
                  >
                    {product.stock}
                  </td>
                  <td className="px-4 py-3">
                    {product.is_active ? (
                      <Badge className="bg-success-soft text-success">Active</Badge>
                    ) : (
                      <Badge className="bg-sand text-muted">Hidden</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/products/${product.id}/edit`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                        Edit
                      </Link>
                      <DeleteProductButton id={product.id} name={product.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={query.page} pageCount={result.pageCount} basePath="/admin/products" params={{ q: query.q }} />
    </>
  );
}
