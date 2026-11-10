import { assertNoError, handler, ok, parseBody, parseId, requireAdmin } from "@/lib/api";
import { orderStatusSchema } from "@/lib/validation";

type Context = RouteContext<"/api/admin/orders/[id]">;

// PATCH /api/admin/orders/:id — change fulfilment status (stock is restored on cancel)
export const PATCH = handler<Context>(async (request, { params }) => {
  const id = parseId((await params).id);
  const { supabase } = await requireAdmin();
  const { status } = await parseBody(request, orderStatusSchema);

  const { data, error } = await supabase.rpc("admin_update_order_status", { p_order_id: id, p_status: status });
  assertNoError(error);
  return ok(data);
});
