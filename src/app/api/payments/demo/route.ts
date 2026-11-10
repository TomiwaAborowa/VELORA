import { z } from "zod";
import { handler, ok, parseBody, requireUser } from "@/lib/api";
import { recordDemoPayment } from "@/lib/payments";

const schema = z.object({
  reference: z.string().regex(/^[A-Za-z0-9-]{6,80}$/, "Invalid payment reference"),
  outcome: z.enum(["success", "failed"]),
});

/**
 * POST /api/payments/demo — simulate a payment outcome for the customer's own
 * order. Only available while PAYSTACK_SECRET_KEY is not configured.
 */
export const POST = handler(async (request) => {
  const { user } = await requireUser();
  const { reference, outcome } = await parseBody(request, schema);
  await recordDemoPayment(reference, user.id, outcome);
  return ok({ reference });
});
