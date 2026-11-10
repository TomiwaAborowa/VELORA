import { handler, ok } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export const POST = handler(async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return ok({ signedOut: true });
});
