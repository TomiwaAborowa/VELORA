import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfilePage() {
  const profile = await requireProfile("/account/profile");

  return (
    <>
      <PageHeader title="Profile settings" description="Update the details we use for your orders." />
      <Card className="max-w-xl p-6">
        <ProfileForm profile={{ email: profile.email, fullName: profile.full_name ?? "", phone: profile.phone ?? "" }} />
      </Card>
      <Card className="mt-6 max-w-xl p-6">
        <h2 className="font-medium">Password</h2>
        <p className="mt-1 text-sm text-muted">Choose a new password for your account.</p>
        <Link href="/reset-password" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
          Change password
        </Link>
      </Card>
    </>
  );
}
