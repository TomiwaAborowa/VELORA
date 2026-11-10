import { z } from "zod";
import { handler, ok, requireAdmin } from "@/lib/api";
import { listOrders } from "@/lib/data/orders";

const querySchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]).optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

// GET /api/admin/orders?status=&q=&page= — all orders (admin only)
export const GET = handler(async (request) => {
  await requireAdmin();
  const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return ok(await listOrders(query));
});
