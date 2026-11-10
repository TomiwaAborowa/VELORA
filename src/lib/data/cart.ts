import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertNoError } from "@/lib/api";
import type { CartLine } from "@/lib/types";

type CartRow = {
  product_id: string;
  quantity: number;
  product: {
    name: string;
    slug: string;
    price: number;
    stock: number;
    images: string[];
    is_active: boolean;
  } | null;
};

export async function getCartLines(supabase: SupabaseClient, userId: string): Promise<CartLine[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("product_id, quantity, product:products(name, slug, price, stock, images, is_active)")
    .eq("user_id", userId)
    .order("created_at");
  assertNoError(error);

  const rows = (data ?? []) as unknown as CartRow[];

  // Products that were unpublished are hidden by RLS; drop them from the cart
  // so checkout isn't blocked by items the customer can no longer see.
  const unavailable = rows.filter((row) => !row.product).map((row) => row.product_id);
  if (unavailable.length > 0) {
    await supabase.from("cart_items").delete().eq("user_id", userId).in("product_id", unavailable);
  }

  return rows
    .filter((row) => row.product)
    .map((row) => ({
      productId: row.product_id,
      quantity: row.quantity,
      name: row.product!.name,
      slug: row.product!.slug,
      price: Number(row.product!.price),
      stock: row.product!.stock,
      image: row.product!.images[0] ?? null,
      isActive: row.product!.is_active,
    }));
}
