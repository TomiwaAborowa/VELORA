import Image from "next/image";
import Link from "next/link";
import { ArrowRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import heroImage from "@/assets/hero.jpg";
import { ProductGrid } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { buttonClasses } from "@/components/ui";
import { getCategoryCovers, listCategories, listProducts } from "@/lib/data/products";

export default async function HomePage() {
  const [{ items: newest }, categories, covers] = await Promise.all([
    listProducts({ sort: "newest", pageSize: 8 }),
    listCategories(),
    getCategoryCovers(),
  ]);

  return (
    <>
      <section className="border-b border-line bg-sand/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">New season edit</p>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              Fewer, better things for the way you live.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Homeware, kitchen tools and everyday accessories, chosen for how well they’re made and how long
              they’ll last.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className={buttonClasses({ size: "lg" })}>
                Shop the collection <ArrowRight className="size-4" aria-hidden />
              </Link>
              {categories[0] && (
                <Link href={`/products?category=${categories[0].slug}`} className={buttonClasses({ variant: "secondary", size: "lg" })}>
                  Explore {categories[0].name}
                </Link>
              )}
            </div>
          </div>
          <div className="relative aspect-4/3 overflow-hidden rounded-3xl bg-sand">
            <Image
              src={heroImage}
              alt="A calm, sunlit living room styled with natural textures and simple furniture"
              fill
              priority
              placeholder="blur"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section aria-label="Why shop with us" className="border-b border-line">
        <ul className="mx-auto grid max-w-7xl gap-4 px-4 py-6 text-sm sm:grid-cols-3 sm:px-6">
          {[
            { Icon: Truck, title: "Free delivery over ₦50,000", body: "Flat ₦2,500 nationwide otherwise." },
            { Icon: ShieldCheck, title: "Secure checkout", body: "Payments processed by Paystack." },
            { Icon: RotateCcw, title: "Easy returns", body: "Change of mind within 14 days." },
          ].map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="categories-heading" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <h2 id="categories-heading" className="font-display text-2xl font-medium">
            Shop by category
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <li key={category.id} className="group relative">
                <ProductImage
                  src={covers[category.id]}
                  alt=""
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                  className="aspect-square rounded-2xl transition-opacity group-hover:opacity-90"
                />
                <Link
                  href={`/products?category=${category.slug}`}
                  className="mt-3 block font-medium after:absolute after:inset-0"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="new-heading" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 id="new-heading" className="font-display text-2xl font-medium">
            New arrivals
          </h2>
          <Link href="/products" className="text-sm font-medium text-accent hover:underline">
            View all
          </Link>
        </div>
        {newest.length > 0 ? (
          <ProductGrid products={newest} />
        ) : (
          <p className="text-muted">Products will appear here once they are added in the admin dashboard.</p>
        )}
      </section>
    </>
  );
}
