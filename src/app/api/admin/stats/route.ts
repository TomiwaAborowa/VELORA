import { handler, ok, requireAdmin } from "@/lib/api";
import { getAdminStats } from "@/lib/data/orders";

// GET /api/admin/stats — revenue, order and inventory summary
export const GET = handler(async () => {
  await requireAdmin();
  return ok(await getAdminStats());
});
