import "server-only";
import { randomBytes } from "node:crypto";
import { ApiError, assertNoError } from "@/lib/api";
import { siteUrl } from "@/lib/env";
import { initializeTransaction, isPaystackConfigured, verifyTransaction } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";

/**
 * Start a Paystack checkout for an order. Every attempt gets a fresh
 * reference because Paystack rejects re-used references.
 */
export async function startPayment(order: Pick<Order, "id" | "order_number" | "total" | "email">, origin: string) {
  const reference = `${order.order_number}-${randomBytes(4).toString("hex")}`;
  const admin = createAdminClient();

  const { error } = await admin
    .from("orders")
    .update({ payment_reference: reference, payment_status: "unpaid" })
    .eq("id", order.id)
    .neq("payment_status", "paid");
  assertNoError(error);

  if (!isPaystackConfigured()) {
    return { reference, authorizationUrl: `${siteUrl(origin)}/checkout/demo-pay?reference=${reference}` };
  }

  const transaction = await initializeTransaction({
    email: order.email,
    amountKobo: Math.round(Number(order.total) * 100),
    reference,
    callbackUrl: `${siteUrl(origin)}/checkout/verify`,
    metadata: { order_id: order.id, order_number: order.order_number },
  });

  return { reference, authorizationUrl: transaction.authorization_url };
}

/**
 * Demo mode only (no Paystack key): record a simulated payment outcome for the
 * customer's own order, through the same idempotent database function.
 */
export async function recordDemoPayment(reference: string, userId: string, outcome: "success" | "failed") {
  if (isPaystackConfigured()) throw new ApiError(404, "not_found", "Not found.");
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("orders")
    .select("id, user_id, total, status, payment_status")
    .eq("payment_reference", reference)
    .maybeSingle();
  assertNoError(error);
  if (!order || order.user_id !== userId) throw new ApiError(404, "not_found", "We could not find this order.");
  if (order.payment_status === "paid") return;
  if (order.status !== "pending") {
    throw new ApiError(409, "order_closed", "This order can no longer be paid. Please place a new order.");
  }

  if (outcome === "success") {
    const { error: confirmError } = await admin.rpc("confirm_order_payment", {
      p_reference: reference,
      p_amount_kobo: Math.round(Number(order.total) * 100),
      p_transaction_id: `demo-${randomBytes(6).toString("hex")}`,
    });
    assertNoError(confirmError);
  } else {
    const { error: failError } = await admin
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", order.id)
      .neq("payment_status", "paid");
    assertNoError(failError);
  }
}

export type VerificationResult =
  | { status: "paid"; order: Order }
  | { status: "failed" | "pending"; order: Order | null; message: string };

/**
 * Verify a transaction with Paystack (never trusting the redirect alone) and
 * record it. Safe to call repeatedly — confirm_order_payment() is idempotent.
 */
export async function verifyAndRecordPayment(reference: string): Promise<VerificationResult> {
  const admin = createAdminClient();

  const { data: existing, error: lookupError } = await admin
    .from("orders")
    .select("*")
    .eq("payment_reference", reference)
    .maybeSingle();
  assertNoError(lookupError);
  if (!existing) throw new ApiError(404, "not_found", "We could not find an order for this payment.");
  if (existing.payment_status === "paid") return { status: "paid", order: existing as Order };

  if (!isPaystackConfigured()) {
    // Demo mode: the outcome was already recorded by recordDemoPayment().
    return existing.payment_status === "failed"
      ? { status: "failed", order: existing as Order, message: "The demo payment was declined." }
      : { status: "pending", order: existing as Order, message: "This payment hasn’t been completed yet." };
  }

  const transaction = await verifyTransaction(reference);

  if (transaction.status === "success") {
    if (transaction.currency !== "NGN") {
      return { status: "failed", order: existing as Order, message: "Payment was made in an unexpected currency." };
    }
    const { data, error } = await admin.rpc("confirm_order_payment", {
      p_reference: reference,
      p_amount_kobo: transaction.amount,
      p_transaction_id: String(transaction.id),
    });
    assertNoError(error);
    const order = data as Order;
    if (order.payment_status !== "paid") {
      return { status: "failed", order, message: "The amount paid did not match your order total." };
    }
    return { status: "paid", order };
  }

  if (transaction.status === "failed" || transaction.status === "abandoned" || transaction.status === "reversed") {
    const { data, error } = await admin
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", existing.id)
      .neq("payment_status", "paid")
      .select("*")
      .maybeSingle();
    assertNoError(error);
    return {
      status: "failed",
      order: (data ?? existing) as Order,
      message: transaction.status === "abandoned" ? "The payment was not completed." : "The payment was declined.",
    };
  }

  return { status: "pending", order: existing as Order, message: "Your payment is still being processed." };
}
