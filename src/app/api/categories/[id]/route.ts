import { ApiError, assertNoError, handler, ok, parseBody, parseId, requireAdmin } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { categorySchema } from "@/lib/validation";

type Context = RouteContext<"/api/categories/[id]">;

export const PATCH = handler<Context>(async (request, { params }) => {
  const id = parseId((await params).id);
  const { supabase } = await requireAdmin();
  const input = await parseBody(request, categorySchema);

  const { data, error } = await supabase
    .from("categories")
    .update({ name: input.name, slug: input.slug || slugify(input.name), description: input.description ?? null })
    .eq("id", id)
    .select()
    .maybeSingle();
  assertNoError(error);
  if (!data) throw new ApiError(404, "not_found", "Category not found.");
  return ok(data);
});

// Products in a deleted category become uncategorised (ON DELETE SET NULL).
export const DELETE = handler<Context>(async (_request, { params }) => {
  const id = parseId((await params).id);
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase.from("categories").delete().eq("id", id).select("id").maybeSingle();
  assertNoError(error);
  if (!data) throw new ApiError(404, "not_found", "Category not found.");
  return ok({ id });
});
