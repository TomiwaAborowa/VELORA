import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils";

/**
 * Landing point for Supabase email links (sign-up confirmation and password
 * recovery). Supports both the PKCE `code` flow and `token_hash` templates.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeRedirectPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let failed = true;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = Boolean(error);
  }

  if (failed) {
    return NextResponse.redirect(new URL("/login?error=link_expired", url.origin));
  }
  const destination = type === "recovery" ? "/reset-password" : next;
  return NextResponse.redirect(new URL(destination, url.origin));
}
