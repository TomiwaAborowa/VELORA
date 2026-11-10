import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { Alert } from "@/components/ui";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);
  const linkExpired = params.error === "link_expired";

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to check out, track orders and manage your account."
      footer={
        <>
          New to Velora?{" "}
          <Link href={`/register${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {linkExpired && (
        <Alert tone="warning" className="mb-5">
          That link is invalid or has expired. Please try again.
        </Alert>
      )}
      <LoginForm next={next} />
    </AuthShell>
  );
}
