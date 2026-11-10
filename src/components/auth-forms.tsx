"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, fieldA11y, Input } from "@/components/ui";
import { useApiForm } from "@/components/use-api-form";
import { api, ApiClientError } from "@/lib/client-api";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { pending, error, fieldError, onSubmit } = useApiForm(async (values) => {
    const { role } = await api<{ role: string }>("/api/auth/login", {
      method: "POST",
      json: { email: values.email, password: values.password },
    });
    router.replace(next === "/account" && role === "admin" ? "/admin" : next);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field id="email" label="Email" error={fieldError("email")}>
        <Input {...fieldA11y("email", fieldError("email"))} type="email" autoComplete="email" required />
      </Field>
      <Field id="password" label="Password" error={fieldError("password")}>
        <Input {...fieldA11y("password", fieldError("password"))} type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end text-sm">
        <Link href="/forgot-password" className="font-medium text-accent hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" loading={pending} className="w-full" size="lg">
        Sign in
      </Button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const { pending, error, fieldError, onSubmit } = useApiForm(async (values) => {
    const { needsConfirmation } = await api<{ needsConfirmation: boolean }>("/api/auth/register", {
      method: "POST",
      json: { fullName: values.fullName, email: values.email, password: values.password },
    });
    if (needsConfirmation) {
      setConfirmEmail(values.email);
      return;
    }
    router.replace("/account");
    router.refresh();
  });

  if (confirmEmail) {
    return (
      <Alert tone="success">
        We’ve sent a confirmation link to <strong>{confirmEmail}</strong>. Open it to activate your account, then sign
        in.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field id="fullName" label="Full name" error={fieldError("fullName")}>
        <Input {...fieldA11y("fullName", fieldError("fullName"))} autoComplete="name" required />
      </Field>
      <Field id="email" label="Email" error={fieldError("email")}>
        <Input {...fieldA11y("email", fieldError("email"))} type="email" autoComplete="email" required />
      </Field>
      <Field
        id="password"
        label="Password"
        error={fieldError("password")}
        hint="At least 8 characters, including a letter and a number."
      >
        <Input {...fieldA11y("password", fieldError("password"))} type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" loading={pending} className="w-full" size="lg">
        Create account
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const { pending, error, fieldError, onSubmit } = useApiForm(async (values) => {
    await api("/api/auth/forgot-password", { method: "POST", json: { email: values.email } });
    setSent(true);
  });

  if (sent) {
    return (
      <Alert tone="success">
        If an account exists for that email, you’ll receive a link to reset your password shortly.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field id="email" label="Email" error={fieldError("email")}>
        <Input {...fieldA11y("email", fieldError("email"))} type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" loading={pending} className="w-full" size="lg">
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const { pending, error, fieldError, onSubmit } = useApiForm(async (values) => {
    if (values.password !== values.confirm) {
      throw new ApiClientError(422, "password_mismatch", "Passwords do not match.", {
        confirm: ["Passwords do not match."],
      });
    }
    await api("/api/auth/reset-password", { method: "POST", json: { password: values.password } });
    router.replace("/account?reset=1");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Field
        id="password"
        label="New password"
        error={fieldError("password")}
        hint="At least 8 characters, including a letter and a number."
      >
        <Input {...fieldA11y("password", fieldError("password"))} type="password" autoComplete="new-password" required />
      </Field>
      <Field id="confirm" label="Confirm new password" error={fieldError("confirm")}>
        <Input {...fieldA11y("confirm", fieldError("confirm"))} type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" loading={pending} className="w-full" size="lg">
        Update password
      </Button>
    </form>
  );
}
