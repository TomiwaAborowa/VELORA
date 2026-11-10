import { ApiError, handler, ok, parseBody, requireUser } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validation";

export const POST = handler(async (request) => {
  const { password } = await parseBody(request, resetPasswordSchema);
  const { supabase } = await requireUser();

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const message =
      error.code === "same_password" ? "Choose a password different from your current one." : error.message;
    throw new ApiError(400, "update_failed", message, { password: [message] });
  }
  return ok({ updated: true });
});
