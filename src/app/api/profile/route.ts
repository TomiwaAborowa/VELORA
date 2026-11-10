import { assertNoError, handler, ok, parseBody, requireUser } from "@/lib/api";
import { profileSchema } from "@/lib/validation";

const COLUMNS = "id, email, full_name, phone, role, created_at";

export const GET = handler(async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("profiles").select(COLUMNS).eq("id", user.id).single();
  assertNoError(error);
  return ok(data);
});

// PATCH /api/profile — customers may only change their name and phone
export const PATCH = handler(async (request) => {
  const { supabase, user } = await requireUser();
  const input = await parseBody(request, profileSchema);

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: input.fullName, phone: input.phone })
    .eq("id", user.id)
    .select(COLUMNS)
    .single();
  assertNoError(error);
  return ok(data);
});
