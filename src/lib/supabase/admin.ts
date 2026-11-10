import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Service-role client that BYPASSES Row Level Security.
 * Only used for server-verified payment bookkeeping — never import from
 * client code, and never pass user-controlled filters to it unchecked.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing environment variable: SUPABASE_SECRET_KEY. See .env.example.");
  }
  return createClient(publicEnv.supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
