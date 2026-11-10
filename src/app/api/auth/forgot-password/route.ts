import { handler, ok, parseBody } from "@/lib/api";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema } from "@/lib/validation";

export const POST = handler(async (request) => {
  const { email } = await parseBody(request, forgotPasswordSchema);
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl(new URL(request.url).origin)}/auth/callback?next=/reset-password`,
  });
  if (error) console.error("[auth] reset password email failed", error.message);

  // Always succeed so the endpoint can't be used to discover registered emails.
  return ok({ sent: true });
});
