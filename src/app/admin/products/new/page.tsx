import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { listCategories } from "@/lib/data/products";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New product · Admin" };

export default async function NewProductPage() {
  const categories = await listCategories();
  return (
    <>
      <PageHeader title="New product" />
      <ProductForm categories={categories} />
    </>
  );
}
