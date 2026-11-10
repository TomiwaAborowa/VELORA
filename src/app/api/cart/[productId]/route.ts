import { ApiError, assertNoError, handler, ok, parseBody, parseId, requireUser } from "@/lib/api";
import { getCartLines } from "@/lib/data/cart";
import { updateCartSchema } from "@/lib/validation";

type Context = RouteContext<"/api/cart/[productId]">;

// PATCH /api/cart/:productId — set quantity
export const PATCH = handler<Context>(async (request, { params }) => {
  const productId = parseId((await params).productId);
  const { supabase, user } = await requireUser();
  const { quantity } = await parseBody(request, updateCartSchema);

  const { data: product } = await supabase.from("products").select("name, stock").eq("id", productId).maybeSingle();
  if (!product) throw new ApiError(404, "not_found", "This product is no longer available.");
  if (quantity > product.stock) {
    throw new ApiError(409, "insufficient_stock", `Only ${product.stock} of ${product.name} available.`);
  }

  const { data, error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .select("product_id")
    .maybeSingle();
  assertNoError(error);
  if (!data) throw new ApiError(404, "not_found", "This item is not in your cart.");

  return ok(await getCartLines(supabase, user.id));
});

export const DELETE = handler<Context>(async (_request, { params }) => {
  const productId = parseId((await params).productId);
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", productId);
  assertNoError(error);
  return ok(await getCartLines(supabase, user.id));
});
