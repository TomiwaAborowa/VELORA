import { handler, ok, requireUser } from "@/lib/api";
import { listOrders } from "@/lib/data/orders";
import { z } from "zod";

const querySchema = z.object({ page: z.coerce.number().int().min(1).catch(1) });

// GET /api/orders — the signed-in customer's order history
export const GET = handler(async (request) => {
  const { user } = await requireUser();
  const { page } = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return ok(await listOrders({ userId: user.id, page }));
});
