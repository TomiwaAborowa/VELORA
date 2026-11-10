import { assertNoError, handler, ok, parseBody, requireUser } from "@/lib/api";
import { startPayment } from "@/lib/payments";
import type { Order } from "@/lib/types";
import { checkoutSchema } from "@/lib/validation";

/**
 * POST /api/checkout
 * Creates an order from the signed-in customer's cart (prices, stock and
 * totals are computed in the database) and starts a Paystack payment.
 */
export const POST = handler(async (request) => {
  const { supabase } = await requireUser();
  const input = await parseBody(request, checkoutSchema);

  const { data, error } = await supabase.rpc("create_order", {
    p_shipping_name: input.fullName,
    p_shipping_phone: input.phone,
    p_shipping_address: input.address,
    p_shipping_city: input.city,
    p_shipping_state: input.state,
    p_shipping_postal_code: input.postalCode ?? null,
    p_delivery_notes: input.notes ?? null,
  });
  assertNoError(error);
  const order = data as Order;

  const payment = await startPayment(order, new URL(request.url).origin);

  return ok(
    {
      orderId: order.id,
      orderNumber: order.order_number,
      total: order.total,
      authorizationUrl: payment.authorizationUrl,
    },
    201,
  );
});
