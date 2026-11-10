import { assertNoError, handler, ok, parseBody, requireAdmin } from "@/lib/api";
import { listCategories } from "@/lib/data/products";
import { slugify } from "@/lib/utils";
import { categorySchema } from "@/lib/validation";

export const GET = handler(async () => ok(await listCategories()));

// POST /api/categories — admin only
export const POST = handler(async (request) => {
  const { supabase } = await requireAdmin();
  const input = await parseBody(request, categorySchema);

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: input.name, slug: input.slug || slugify(input.name), description: input.description ?? null })
    .select()
    .single();
  assertNoError(error);
  return ok(data, 201);
});
