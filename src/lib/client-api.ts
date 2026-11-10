export type FieldErrors = Record<string, string[] | undefined>;

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: FieldErrors,
  ) {
    super(message);
  }
}

/** Calls the REST API and unwraps `{ data }` or throws `ApiClientError`. */
export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiClientError(0, "network_error", "Network error. Check your connection and try again.");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const error = body?.error;
    throw new ApiClientError(
      res.status,
      error?.code ?? "unknown_error",
      error?.message ?? "Something went wrong. Please try again.",
      error?.fields,
    );
  }
  return body?.data as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
