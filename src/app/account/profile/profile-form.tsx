"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, fieldA11y, Input } from "@/components/ui";
import { useApiForm } from "@/components/use-api-form";
import { api } from "@/lib/client-api";

export function ProfileForm({ profile }: { profile: { email: string; fullName: string; phone: string } }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const { pending, error, fieldError, onSubmit } = useApiForm(async (values) => {
    setSaved(false);
    await api("/api/profile", { method: "PATCH", json: { fullName: values.fullName, phone: values.phone } });
    setSaved(true);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">Your profile has been updated.</Alert>}
      <Field id="email" label="Email" hint="Your email address can’t be changed.">
        <Input id="email" value={profile.email} disabled readOnly />
      </Field>
      <Field id="fullName" label="Full name" error={fieldError("fullName")}>
        <Input {...fieldA11y("fullName", fieldError("fullName"))} defaultValue={profile.fullName} autoComplete="name" required />
      </Field>
      <Field id="phone" label="Phone number" optional error={fieldError("phone")}>
        <Input {...fieldA11y("phone", fieldError("phone"))} defaultValue={profile.phone} type="tel" autoComplete="tel" />
      </Field>
      <Button type="submit" loading={pending}>
        Save changes
      </Button>
    </form>
  );
}
