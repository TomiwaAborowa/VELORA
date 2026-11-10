import { ApiError, handler, ok, parseBody } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation";

export const POST = handler(async (request) => {
  const { email, password } = await parseBody(request, loginSchema);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      throw new ApiError(403, "email_not_confirmed", "Please confirm your email address before signing in.");
    }
    throw new ApiError(401, "invalid_credentials", "Incorrect email or password.");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  return ok({ role: profile?.role ?? "customer" });
});
