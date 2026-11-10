import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const soldOut = product.stock === 0;
  const lowStock = !soldOut && product.stock <= LOW_STOCK_THRESHOLD;

  return (
    <article className="group relative">
      <ProductImage
        src={product.images[0]}
        alt={product.name}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        priority={priority}
        className="aspect-[4/5] rounded-2xl transition-opacity group-hover:opacity-90"
      />
      {(soldOut || lowStock) && (
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${
            soldOut ? "bg-ink text-white" : "bg-surface text-warning"
          }`}
        >
          {soldOut ? "Sold out" : `Only ${product.stock} left`}
        </span>
      )}
      <div className="mt-3 space-y-1">
        {product.category && <p className="text-xs uppercase tracking-wider text-muted">{product.category.name}</p>}
        <h3 className="font-medium leading-snug">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <p className="text-sm text-ink/80">{formatPrice(product.price)}</p>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < 4} />
        </li>
      ))}
    </ul>
  );
}
