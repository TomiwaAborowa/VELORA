import { assertNoError, handler, ok, parseBody, requireUser } from "@/lib/api";
import { MAX_CART_QUANTITY } from "@/lib/constants";
import { getCartLines } from "@/lib/data/cart";
import { mergeCartSchema } from "@/lib/validation";

/**
 * POST /api/cart/merge — move a guest's local cart into their account after
 * sign-in. Quantities are combined and clamped to available stock; items that
 * are unavailable are skipped.
 */
export const POST = handler(async (request) => {
  const { supabase, user } = await requireUser();
  const { items } = await parseBody(request, mergeCartSchema);

  if (items.length > 0) {
    const ids = [...new Set(items.map((i) => i.productId))];
    const [{ data: products }, { data: existing }] = await Promise.all([
      supabase.from("products").select("id, stock").in("id", ids).eq("is_active", true),
      supabase.from("cart_items").select("product_id, quantity").eq("user_id", user.id).in("product_id", ids),
    ]);

    const stock = new Map<string, number>((products ?? []).map((p) => [p.id, p.stock]));
    const current = new Map<string, number>((existing ?? []).map((c) => [c.product_id, c.quantity]));
    const incoming = new Map<string, number>();
    for (const item of items) incoming.set(item.productId, (incoming.get(item.productId) ?? 0) + item.quantity);

    const rows = [...incoming.entries()]
      .filter(([id]) => (stock.get(id) ?? 0) > 0)
      .map(([id, qty]) => ({
        user_id: user.id,
        product_id: id,
        quantity: Math.min((current.get(id) ?? 0) + qty, stock.get(id)!, MAX_CART_QUANTITY),
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from("cart_items").upsert(rows, { onConflict: "user_id,product_id" });
      assertNoError(error);
    }
  }

  return ok(await getCartLines(supabase, user.id));
});
