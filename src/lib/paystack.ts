import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api";

const PAYSTACK_API = "https://api.paystack.co";

/**
 * Paystack is optional. Without a real secret key the store runs in demo
 * payment mode (see /checkout/demo-pay), and the Paystack calls below are off.
 */
export function isPaystackConfigured() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return Boolean(key && key.startsWith("sk_") && !key.endsWith("_xxx"));
}

function secretKey() {
  if (!isPaystackConfigured()) {
    throw new ApiError(503, "payments_unavailable", "Paystack is not configured on this server.");
  }
  return process.env.PAYSTACK_SECRET_KEY!;
}

type PaystackResponse<T> = { status: boolean; message: string; data: T };

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as PaystackResponse<T> | null;
  if (!res.ok || !body?.status) {
    console.error("[paystack]", res.status, body?.message);
    throw new ApiError(502, "payment_provider_error", "We could not reach the payment provider. Please try again.");
  }
  return body.data;
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}) {
  return paystack<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

export type PaystackTransaction = {
  id: number;
  status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "processing" | "queued" | "reversed";
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
};

export async function verifyTransaction(reference: string) {
  return paystack<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Validate the x-paystack-signature header (HMAC-SHA512 of the raw body). */
export function isValidWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
