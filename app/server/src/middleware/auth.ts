import { eq, sql } from "drizzle-orm";
import { db } from "../db/connection";
import { sessions, businesses, affiliates } from "../db/schema";
import { getSessionCookie } from "../lib/cookies";
import type { AccountType } from "@ascnd/shared/constants";

export interface AuthenticatedUser {
  userId: string;
  userType: AccountType;
  email: string;
  name: string;
  sessionId: string;
}

export interface RequestContext {
  user?: AuthenticatedUser;
}

/**
 * Middleware that checks for a valid session cookie and loads the user.
 * Attaches { user } to the request context.
 * If no valid session, ctx.user is undefined.
 */
export async function authMiddleware(
  request: Request
): Promise<AuthenticatedUser | null> {
  const sessionId = getSessionCookie(request);
  if (!sessionId) return null;

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) return null;

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    // Clean up expired session
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  // Extend session (sliding expiration)
  const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db
    .update(sessions)
    .set({ expires_at: newExpires })
    .where(eq(sessions.id, sessionId));

  if (session.user_type === "business") {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, session.user_id))
      .limit(1);

    if (!business) return null;

    return {
      userId: business.id,
      userType: "business",
      email: business.email,
      name: business.company_name,
      sessionId,
    };
  }

  if (session.user_type === "affiliate") {
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, session.user_id))
      .limit(1);

    if (!affiliate) return null;

    return {
      userId: affiliate.id,
      userType: "affiliate",
      email: affiliate.email,
      name: affiliate.name,
      sessionId,
    };
  }

  return null;
}

/**
 * Require authentication — returns 401 if no valid session.
 */
export async function requireAuth(request: Request): Promise<AuthenticatedUser> {
  const user = await authMiddleware(request);
  if (!user) {
    throw new AuthError("Authentication required");
  }
  return user;
}

/**
 * Require a specific user type.
 */
export async function requireRole(
  request: Request,
  role: AccountType
): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  if (user.userType !== role) {
    throw new AuthError(`This endpoint requires a ${role} account`);
  }
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
