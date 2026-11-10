import "server-only";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import type { PostgrestError, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Consistent REST responses:
 *   success → { data: T }
 *   failure → { error: { code, message, fields? } }
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json({ data }, typeof init === "number" ? { status: init } : init);
}

function errorResponse(error: ApiError) {
  return NextResponse.json(
    { error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } },
    { status: error.status },
  );
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

/** Wraps a route handler with uniform error handling. */
export function handler<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error);
      if (error instanceof ZodError) {
        return errorResponse(
          new ApiError(422, "validation_error", "Please check the highlighted fields.", z.flattenError(error).fieldErrors),
        );
      }
      console.error("[api] Unhandled error", error);
      return errorResponse(new ApiError(500, "internal_error", "Something went wrong. Please try again."));
    }
  };
}

/** Parse and validate a JSON body. */
export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
  return schema.parse(body);
}

/** Translate a Postgres/PostgREST error into an ApiError. */
export function dbError(error: PostgrestError): ApiError {
  switch (error.code) {
    case "VL400":
      return new ApiError(400, "business_rule", error.message);
    case "VL401":
      return new ApiError(401, "unauthenticated", error.message);
    case "VL403":
    case "42501":
      return new ApiError(403, "forbidden", "You do not have permission to do that.");
    case "VL404":
    case "PGRST116":
      return new ApiError(404, "not_found", "Not found.");
    case "23505":
      return new ApiError(409, "conflict", "A record with that slug already exists.");
    case "23503":
      return new ApiError(409, "conflict", "This record is still referenced by other data.");
    case "23514":
      return new ApiError(400, "constraint_violation", "One or more values are not allowed.");
    default:
      console.error("[api] Database error", error);
      return new ApiError(500, "database_error", "A database error occurred.");
  }
}

export function assertNoError(error: PostgrestError | null): asserts error is null {
  if (error) throw dbError(error);
}

type Session = { supabase: Awaited<ReturnType<typeof createClient>>; user: User };

export async function requireUser(): Promise<Session> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "unauthenticated", "Please sign in to continue.");
  return { supabase, user };
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  const { data } = await session.supabase.from("profiles").select("role").eq("id", session.user.id).single();
  if (data?.role !== "admin") throw new ApiError(403, "forbidden", "Administrator access required.");
  return session;
}

export function parseId(value: string) {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new ApiError(404, "not_found", "Not found.");
  return result.data;
}
