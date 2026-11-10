import { z } from "zod";
import { ApiError, handler, ok } from "@/lib/api";
import { verifyAndRecordPayment } from "@/lib/payments";

const querySchema = z.object({ reference: z.string().regex(/^[A-Za-z0-9-]{6,80}$/) });

/**
 * GET /api/payments/verify?reference=
 * Verifies a transaction directly with Paystack and records the result.
 * Idempotent; returns only the order id and statuses.
 */
export const GET = handler(async (request) => {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) throw new ApiError(400, "invalid_reference", "A valid payment reference is required.");

  const result = await verifyAndRecordPayment(parsed.data.reference);
  return ok({
    status: result.status,
    message: result.status === "paid" ? "Payment confirmed." : result.message,
    orderId: result.order?.id ?? null,
    orderStatus: result.order?.status ?? null,
    paymentStatus: result.order?.payment_status ?? null,
  });
});
