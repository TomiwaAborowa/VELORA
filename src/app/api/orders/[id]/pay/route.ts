import { ApiError, assertNoError, handler, ok, parseId, requireUser } from "@/lib/api";
import { startPayment } from "@/lib/payments";
import type { Order } from "@/lib/types";

type Context = RouteContext<"/api/orders/[id]/pay">;

// POST /api/orders/:id/pay — retry payment for the customer's own unpaid order
export const POST = handler<Context>(async (request, { params }) => {
  const id = parseId((await params).id);
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, total, email, status, payment_status, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  assertNoError(error);
  if (!data) throw new ApiError(404, "not_found", "Order not found.");

  const order = data as Order;
  if (order.payment_status === "paid") throw new ApiError(409, "already_paid", "This order has already been paid.");
  if (order.status !== "pending") {
    throw new ApiError(409, "order_closed", "This order can no longer be paid. Please place a new order.");
  }

  const payment = await startPayment(order, new URL(request.url).origin);
  return ok({ authorizationUrl: payment.authorizationUrl });
});
