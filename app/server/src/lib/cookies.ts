import { createHmac } from "crypto";
import type { Session } from "@ascnd/shared/types";

const SECRET = process.env.COOKIE_SECRET || "ascnd-dev-secret-change-in-production";

export function signCookie(value: string): string {
  const hmac = createHmac("sha256", SECRET);
  hmac.update(value);
  const signature = hmac.digest("hex");
  return `${value}.${signature}`;
}

export function verifySignedCookie(signed: string): string | null {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;

  const value = signed.slice(0, lastDot);
  const expected = signCookie(value);

  // Constant-time comparison
  if (signed.length !== expected.length) return null;
  let ok = 0;
  for (let i = 0; i < signed.length; i++) {
    ok |= signed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return ok === 0 ? value : null;
}

export function setSessionCookie(
  headers: Headers,
  sessionId: string,
  maxAge: number
): void {
  const signed = signCookie(sessionId);
  headers.set(
    "Set-Cookie",
    `ascnd_session=${signed}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`
  );
}

export function clearSessionCookie(headers: Headers): void {
  headers.set(
    "Set-Cookie",
    `ascnd_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
  );
}

export function getSessionCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  const match = cookie.match(/ascnd_session=([^;]+)/);
  if (!match) return null;

  return verifySignedCookie(match[1]);
}
