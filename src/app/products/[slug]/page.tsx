import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Truck } from "lucide-react";
import { AddToCart } from "@/components/add-to-cart";
import { ProductGrid } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { FREE_SHIPPING_THRESHOLD, LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { getProductBySlug, getRelatedProducts } from "@/lib/data/products";
import { formatPrice } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: product.images[0] ? { images: [product.images[0]] } : undefined,
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = await getProductBySlug((await params).slug);
  if (!product || !product.is_active) notFound();

  const related = await getRelatedProducts(product);
  const stockLabel =
    product.stock === 0
      ? { text: "Out of stock", className: "text-danger" }
      : product.stock <= LOW_STOCK_THRESHOLD
        ? { text: `Only ${product.stock} left in stock`, className: "text-warning" }
        : { text: "In stock", className: "text-success" };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/products" className="hover:text-ink">Shop</Link></li>
          {product.category && (
            <li className="flex items-center gap-1">
              <ChevronRight className="size-3.5" aria-hidden />
              <Link href={`/products?category=${product.category.slug}`} className="hover:text-ink">
                {product.category.name}
              </Link>
            </li>
          )}
          <li className="flex items-center gap-1 text-ink">
            <ChevronRight className="size-3.5 text-muted" aria-hidden />
            <span aria-current="page">{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />

        <div className="lg:pt-4">
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-4 text-2xl">{formatPrice(product.price)}</p>
          <p className={`mt-2 text-sm font-medium ${stockLabel.className}`}>{stockLabel.text}</p>

          <div className="mt-8">
            <AddToCart
              product={{
                productId: product.id,
                name: product.name,
                slug: product.slug,
                price: Number(product.price),
                stock: product.stock,
                image: product.images[0] ?? null,
                isActive: product.is_active,
              }}
            />
          </div>

          <div className="mt-8 flex gap-3 rounded-2xl bg-sand/70 p-4 text-sm">
            <Truck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <p>
              Free delivery on orders over {formatPrice(FREE_SHIPPING_THRESHOLD)}. Orders are dispatched within 2
              working days.
            </p>
          </div>

          {product.description && (
            <section className="mt-10 border-t border-line pt-8" aria-labelledby="description-heading">
              <h2 id="description-heading" className="font-medium">Description</h2>
              <div className="mt-3 space-y-3 whitespace-pre-line leading-relaxed text-ink/80">{product.description}</div>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-8 font-display text-2xl font-medium">
            You may also like
          </h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
