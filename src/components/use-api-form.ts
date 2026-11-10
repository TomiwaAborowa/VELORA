"use client";

import { useState, type FormEvent } from "react";
import { ApiClientError, errorMessage, type FieldErrors } from "@/lib/client-api";

/**
 * Submit state for forms backed by the REST API: tracks pending state, a
 * top-level error and per-field validation errors returned by the server.
 */
export function useApiForm(submit: (values: Record<string, string>, form: HTMLFormElement) => Promise<void>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(
      [...new FormData(form).entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]),
    );
    setPending(true);
    setError(null);
    setFields({});
    try {
      await submit(values, form);
    } catch (e) {
      if (e instanceof ApiClientError && e.fields) setFields(e.fields);
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  const fieldError = (name: string) => fields[name]?.[0];

  return { pending, error, fieldError, onSubmit, setError };
}
