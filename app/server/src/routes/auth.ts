import { eq } from "drizzle-orm";
import { db } from "../db/connection";
import { businesses, affiliates, sessions } from "../db/schema";
import { generateId, generateApiKey } from "../lib/id";
import { setSessionCookie, clearSessionCookie } from "../lib/cookies";
import { requireAuth } from "../middleware/auth";
import { jsonResponse, errorResponse, parseBody, BodyError } from "../lib/response";
import { registerSchema, loginSchema } from "@ascnd/shared/schemas";
import { hash, compare } from "bcryptjs";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export async function handleRegister(request: Request): Promise<Response> {
  try {
    const body = await parseBody(request, registerSchema);

    // Check if email already exists
    const [existingBusiness] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.email, body.email))
      .limit(1);

    const [existingAffiliate] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.email, body.email))
      .limit(1);

    if (existingBusiness || existingAffiliate) {
      return errorResponse("Email already registered", 409);
    }

    const passwordHash = await hash(body.password, 10);
    const userId = generateId();

    if (body.account_type === "business") {
      const apiKey = generateApiKey();

      await db.insert(businesses).values({
        id: userId,
        email: body.email,
        password_hash: passwordHash,
        company_name: body.company_name || body.name,
        website: body.website || null,
        api_key: apiKey,
      });

      // Create session
      const sessionId = generateId();
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
      await db.insert(sessions).values({
        id: sessionId,
        user_id: userId,
        user_type: "business",
        expires_at: expiresAt,
      });

      const headers = new Headers();
      setSessionCookie(headers, sessionId, SESSION_MAX_AGE);

      return new Response(
        JSON.stringify({
          id: userId,
          email: body.email,
          company_name: body.company_name || body.name,
          account_type: "business",
          api_key: apiKey,
        }),
        { status: 201, headers }
      );
    }

    // Affiliate
    if (!body.payment_email) {
      return errorResponse("payment_email is required for affiliate accounts", 400);
    }

    await db.insert(affiliates).values({
      id: userId,
      email: body.email,
      password_hash: passwordHash,
      name: body.name,
      website: body.website || null,
      payment_email: body.payment_email || body.email,
    });

    // Create session
    const sessionId = generateId();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
    await db.insert(sessions).values({
      id: sessionId,
      user_id: userId,
      user_type: "affiliate",
      expires_at: expiresAt,
    });

    const headers = new Headers();
    setSessionCookie(headers, sessionId, SESSION_MAX_AGE);

    return new Response(
      JSON.stringify({
        id: userId,
        email: body.email,
        name: body.name,
        account_type: "affiliate",
      }),
      { status: 201, headers }
    );
  } catch (err) {
    if (err instanceof BodyError) {
      return errorResponse(err.message, 400, err.details);
    }
    throw err;
  }
}

export async function handleLogin(request: Request): Promise<Response> {
  try {
    const body = await parseBody(request, loginSchema);

    // Search both tables
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.email, body.email))
      .limit(1);

    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.email, body.email))
      .limit(1);

    let userType: "business" | "affiliate" | null = null;
    let userId: string | null = null;
    let passwordHash: string | null = null;
    let name: string | null = null;

    if (business) {
      userType = "business";
      userId = business.id;
      passwordHash = business.password_hash;
      name = business.company_name;
    } else if (affiliate) {
      userType = "affiliate";
      userId = affiliate.id;
      passwordHash = affiliate.password_hash;
      name = affiliate.name;
    }

    if (!userId || !passwordHash) {
      return errorResponse("Invalid email or password", 401);
    }

    const valid = await compare(body.password, passwordHash);
    if (!valid) {
      return errorResponse("Invalid email or password", 401);
    }

    // Create session
    const sessionId = generateId();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
    await db.insert(sessions).values({
      id: sessionId,
      user_id: userId,
      user_type: userType!,
      expires_at: expiresAt,
    });

    const headers = new Headers();
    setSessionCookie(headers, sessionId, SESSION_MAX_AGE);

    return jsonResponse(
      {
        id: userId,
        email: body.email,
        name,
        account_type: userType,
        ...(business ? { api_key: business.api_key } : {}),
      },
      200
    );
  } catch (err) {
    if (err instanceof BodyError) {
      return errorResponse(err.message, 400, err.details);
    }
    throw err;
  }
}

export async function handleLogout(request: Request): Promise<Response> {
  const sessionId = request.headers
    .get("cookie")
    ?.match(/ascnd_session=([^;.]+)/)?.[1];

  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  const headers = new Headers();
  clearSessionCookie(headers);
  return jsonResponse({ ok: true }, 200);
}

export async function handleMe(request: Request): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType === "business") {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, user.userId))
      .limit(1);

    if (!business) {
      return errorResponse("Business not found", 404);
    }

    return jsonResponse({
      id: business.id,
      email: business.email,
      company_name: business.company_name,
      website: business.website,
      logo_url: business.logo_url,
      account_type: "business",
      api_key: business.api_key,
      created_at: business.created_at,
    });
  }

  // Affiliate
  const [affiliate] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.id, user.userId))
    .limit(1);

  if (!affiliate) {
    return errorResponse("Affiliate not found", 404);
  }

  return jsonResponse({
    id: affiliate.id,
    email: affiliate.email,
    name: affiliate.name,
    bio: affiliate.bio,
    website: affiliate.website,
    payment_email: affiliate.payment_email,
    account_type: "affiliate",
    created_at: affiliate.created_at,
  });
}
