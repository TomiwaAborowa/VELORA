import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password" };

// Reached from the recovery email via /auth/callback, which signs the user in.
export default async function ResetPasswordPage() {
  const profile = await getCurrentProfile();

  return (
    <AuthShell title="Choose a new password">
      {profile ? (
        <ResetPasswordForm />
      ) : (
        <Alert tone="warning">
          This reset link is invalid or has expired.{" "}
          <Link href="/forgot-password" className="font-medium underline">
            Request a new one
          </Link>
          .
        </Alert>
      )}
    </AuthShell>
  );
}
