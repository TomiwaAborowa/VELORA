import { ApiError, handler, ok, parseId, requireUser } from "@/lib/api";
import { getOrder } from "@/lib/data/orders";

type Context = RouteContext<"/api/orders/[id]">;

// GET /api/orders/:id — RLS limits customers to their own orders
export const GET = handler<Context>(async (_request, { params }) => {
  const id = parseId((await params).id);
  await requireUser();
  const order = await getOrder(id);
  if (!order) throw new ApiError(404, "not_found", "Order not found.");
  return ok(order);
});
