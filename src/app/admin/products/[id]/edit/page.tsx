import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/ui";
import { getProductById, listCategories } from "@/lib/data/products";
import { DeleteProductButton } from "../../delete-product-button";
import { ProductForm } from "../../product-form";

export const metadata: Metadata = { title: "Edit product · Admin" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]/edit">) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const [product, categories] = await Promise.all([getProductById(id.data), listCategories()]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title="Edit product"
        description={
          product.is_active ? (
            <Link href={`/products/${product.slug}`} className="text-accent hover:underline">View in store</Link>
          ) : (
            "Hidden from the store"
          )
        }
        action={<DeleteProductButton id={product.id} name={product.name} redirectTo="/admin/products" />}
      />
      <ProductForm product={product} categories={categories} />
    </>
  );
}
