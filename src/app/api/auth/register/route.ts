import { ApiError, handler, ok, parseBody } from "@/lib/api";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validation";

export const POST = handler(async (request) => {
  const { fullName, email, password } = await parseBody(request, registerSchema);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl(new URL(request.url).origin)}/auth/callback?next=/account`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      throw new ApiError(409, "email_taken", "An account with this email already exists.", {
        email: ["An account with this email already exists."],
      });
    }
    if (error.code === "weak_password") {
      throw new ApiError(422, "weak_password", error.message, { password: [error.message] });
    }
    throw new ApiError(400, "signup_failed", error.message);
  }

  // When email confirmation is enabled Supabase returns no session.
  return ok({ needsConfirmation: !data.session }, 201);
});
