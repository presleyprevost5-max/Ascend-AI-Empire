import type { ZodSchema } from "zod";

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status: number, details?: unknown): Response {
  return new Response(
    JSON.stringify({ error: message, ...(details ? { details } : {}) }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BodyError("Invalid JSON body");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BodyError("Validation failed", result.error.flatten());
  }

  return result.data;
}

export class BodyError extends Error {
  details?: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "BodyError";
    this.details = details;
  }
}
