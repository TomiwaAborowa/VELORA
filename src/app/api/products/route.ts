import { assertNoError, handler, ok, parseBody, requireAdmin } from "@/lib/api";
import { listProducts, PRODUCT_COLUMNS } from "@/lib/data/products";
import { slugify } from "@/lib/utils";
import { productQuerySchema, productSchema } from "@/lib/validation";

// GET /api/products?q=&category=&sort=newest|price_asc|price_desc&page=&pageSize=
export const GET = handler(async (request) => {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = productQuerySchema.parse(params);
  return ok(await listProducts(query));
});

// POST /api/products — admin only
export const POST = handler(async (request) => {
  const { supabase } = await requireAdmin();
  const input = await parseBody(request, productSchema);

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      slug: input.slug || slugify(input.name),
      description: input.description,
      price: input.price,
      stock: input.stock,
      category_id: input.categoryId,
      images: input.images,
      is_active: input.isActive,
    })
    .select(PRODUCT_COLUMNS)
    .single();
  assertNoError(error);

  return ok(data, 201);
});
