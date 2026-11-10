import { ApiError, assertNoError, handler, ok, parseBody, parseId, requireAdmin } from "@/lib/api";
import { getProductById, PRODUCT_COLUMNS } from "@/lib/data/products";
import { slugify } from "@/lib/utils";
import { productSchema } from "@/lib/validation";

type Context = RouteContext<"/api/products/[id]">;

export const GET = handler<Context>(async (_request, { params }) => {
  const id = parseId((await params).id);
  const product = await getProductById(id);
  if (!product) throw new ApiError(404, "not_found", "Product not found.");
  return ok(product);
});

// PATCH /api/products/:id — admin only, partial update
export const PATCH = handler<Context>(async (request, { params }) => {
  const id = parseId((await params).id);
  const { supabase } = await requireAdmin();
  const input = await parseBody(request, productSchema.partial());

  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.slug !== undefined) update.slug = input.slug || slugify(input.name ?? "");
  if (input.description !== undefined) update.description = input.description;
  if (input.price !== undefined) update.price = input.price;
  if (input.stock !== undefined) update.stock = input.stock;
  if (input.categoryId !== undefined) update.category_id = input.categoryId;
  if (input.images !== undefined) update.images = input.images;
  if (input.isActive !== undefined) update.is_active = input.isActive;
  if (update.slug === "") {
    throw new ApiError(422, "validation_error", "Please check the highlighted fields.", { slug: ["A slug is required"] });
  }

  const { data, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", id)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();
  assertNoError(error);
  if (!data) throw new ApiError(404, "not_found", "Product not found.");
  return ok(data);
});

// DELETE /api/products/:id — admin only. Past orders keep their snapshot.
export const DELETE = handler<Context>(async (_request, { params }) => {
  const id = parseId((await params).id);
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase.from("products").delete().eq("id", id).select("id").maybeSingle();
  assertNoError(error);
  if (!data) throw new ApiError(404, "not_found", "Product not found.");
  return ok({ id });
});
