import "server-only";
import { assertNoError } from "@/lib/api";
import type { ProductSort } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Category, Paginated, Product } from "@/lib/types";

export const PRODUCT_COLUMNS =
  "id, category_id, name, slug, description, price, stock, images, is_active, created_at, updated_at, category:categories(id, name, slug)";

export type ProductQuery = {
  q?: string;
  category?: string;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
};

/** Escape LIKE wildcards in user input. */
function likePattern(term: string) {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function listProducts(query: ProductQuery = {}): Promise<Paginated<Product>> {
  const { q, category, sort = "newest", page = 1, pageSize = 12, includeInactive = false } = query;
  const supabase = await createClient();

  let request = supabase.from("products").select(PRODUCT_COLUMNS, { count: "exact" });

  if (!includeInactive) request = request.eq("is_active", true);
  if (q) request = request.ilike("name", likePattern(q));
  if (category) {
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", category).maybeSingle();
    if (!cat) return { items: [], total: 0, page, pageSize, pageCount: 0 };
    request = request.eq("category_id", cat.id);
  }

  request =
    sort === "price_asc"
      ? request.order("price", { ascending: true }).order("id")
      : sort === "price_desc"
        ? request.order("price", { ascending: false }).order("id")
        : request.order("created_at", { ascending: false }).order("id");

  const from = (page - 1) * pageSize;
  const { data, count, error } = await request.range(from, from + pageSize - 1);
  // Requesting a page past the end returns a range error — treat as empty.
  if (error?.code === "PGRST103") return { items: [], total: count ?? 0, page, pageSize, pageCount: 0 };
  assertNoError(error);

  const total = count ?? 0;
  return { items: (data ?? []) as unknown as Product[], total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(PRODUCT_COLUMNS).eq("slug", slug).maybeSingle();
  assertNoError(error);
  return data as unknown as Product | null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(PRODUCT_COLUMNS).eq("id", id).maybeSingle();
  assertNoError(error);
  return data as unknown as Product | null;
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  if (!product.category_id) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  assertNoError(error);
  return (data ?? []) as unknown as Product[];
}

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, created_at")
    .order("name");
  assertNoError(error);
  return (data ?? []) as Category[];
}

/** Cover image per category: the newest active product's first photo. */
export async function getCategoryCovers(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("category_id, images")
    .eq("is_active", true)
    .not("category_id", "is", null)
    .neq("images", "{}")
    .order("created_at", { ascending: false });
  assertNoError(error);

  const covers: Record<string, string> = {};
  for (const row of data ?? []) {
    if (!covers[row.category_id] && row.images[0]) covers[row.category_id] = row.images[0];
  }
  return covers;
}

export async function listCategoriesWithCounts(): Promise<(Category & { product_count: number })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, created_at, products(count)")
    .order("name");
  assertNoError(error);
  return (data ?? []).map(({ products, ...category }) => ({
    ...(category as Category),
    product_count: (products as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}
