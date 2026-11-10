import { ApiError, assertNoError, handler, ok, parseBody, requireUser } from "@/lib/api";
import { getCartLines } from "@/lib/data/cart";
import { addToCartSchema } from "@/lib/validation";

export const GET = handler(async () => {
  const { supabase, user } = await requireUser();
  return ok(await getCartLines(supabase, user.id));
});

// POST /api/cart — add a product (increments if already in the cart)
export const POST = handler(async (request) => {
  const { supabase, user } = await requireUser();
  const { productId, quantity } = await parseBody(request, addToCartSchema);

  const [{ data: product }, { data: existing }] = await Promise.all([
    supabase.from("products").select("name, stock, is_active").eq("id", productId).maybeSingle(),
    supabase.from("cart_items").select("quantity").eq("user_id", user.id).eq("product_id", productId).maybeSingle(),
  ]);
  if (!product || !product.is_active) throw new ApiError(404, "not_found", "This product is no longer available.");

  const next = (existing?.quantity ?? 0) + quantity;
  if (next > product.stock) {
    throw new ApiError(
      409,
      "insufficient_stock",
      product.stock === 0 ? `${product.name} is out of stock.` : `Only ${product.stock} of ${product.name} available.`,
    );
  }

  const { error } = await supabase
    .from("cart_items")
    .upsert({ user_id: user.id, product_id: productId, quantity: next }, { onConflict: "user_id,product_id" });
  assertNoError(error);

  return ok(await getCartLines(supabase, user.id), 201);
});

// DELETE /api/cart — empty the cart
export const DELETE = handler(async () => {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id);
  assertNoError(error);
  return ok([]);
});
