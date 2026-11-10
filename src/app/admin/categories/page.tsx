import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { listCategoriesWithCounts } from "@/lib/data/products";
import { CategoryManager } from "./category-manager";

export const metadata: Metadata = { title: "Categories · Admin" };

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesWithCounts();
  return (
    <>
      <PageHeader title="Categories" description="Organise the catalogue. Deleting a category leaves its products uncategorised." />
      <CategoryManager categories={categories} />
    </>
  );
}
