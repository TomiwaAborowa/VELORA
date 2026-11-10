import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api";
import { isValidWebhookSignature } from "@/lib/paystack";
import { verifyAndRecordPayment } from "@/lib/payments";

/**
 * POST /api/payments/webhook — Paystack event notifications.
 * The signature is checked against the raw body, and the transaction is
 * re-verified with Paystack before anything is recorded.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    if (!isValidWebhookSignature(rawBody, request.headers.get("x-paystack-signature"))) {
      return NextResponse.json({ error: { code: "invalid_signature", message: "Invalid signature." } }, { status: 401 });
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    }
    throw error;
  }

  const event = JSON.parse(rawBody) as { event: string; data?: { reference?: string } };

  if (event.event === "charge.success" && event.data?.reference) {
    try {
      await verifyAndRecordPayment(event.data.reference);
    } catch (error) {
      // Unknown references (e.g. payments from another integration) are acknowledged.
      if (!(error instanceof ApiError && error.status === 404)) {
        console.error("[webhook] Failed to record payment", error);
        return NextResponse.json({ error: { code: "processing_failed", message: "Retry later." } }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
