import { eq, and } from "drizzle-orm";
import { db } from "../db/connection";
import { links, programAffiliates, programs } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { jsonResponse, errorResponse, parseBody, BodyError } from "../lib/response";
import { linkCreateSchema } from "@ascnd/shared/schemas";
import { generateId, generateShortCode } from "../lib/id";

// POST /api/v1/links
export async function handleCreateLink(request: Request): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "affiliate") {
    return errorResponse("Only affiliates can create links", 403);
  }

  try {
    const body = await parseBody(request, linkCreateSchema);

    // Verify enrollment in program (must be approved)
    const [enrollment] = await db
      .select()
      .from(programAffiliates)
      .where(
        and(
          eq(programAffiliates.program_id, body.program_id),
          eq(programAffiliates.affiliate_id, user.userId),
          eq(programAffiliates.status, "approved")
        )
      )
      .limit(1);

    if (!enrollment) {
      return errorResponse(
        "You must be approved in this program to create links",
        403
      );
    }

    // Get program for default destination
    const [program] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, body.program_id))
      .limit(1);

    if (!program) return errorResponse("Program not found", 404);

    const destinationUrl = body.destination_url || program.signup_url || "";
    if (!destinationUrl) {
      return errorResponse(
        "No destination URL provided and program has no default signup URL",
        400
      );
    }

    const linkId = generateId();
    const shortCode = generateShortCode();
    const now = new Date().toISOString();

    await db.insert(links).values({
      id: linkId,
      program_affiliate_id: enrollment.id,
      destination_url: destinationUrl,
      short_code: shortCode,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      created_at: now,
    });

    const [created] = await db
      .select()
      .from(links)
      .where(eq(links.id, linkId))
      .limit(1);

    return new Response(JSON.stringify(created), { status: 201 });
  } catch (err) {
    if (err instanceof BodyError) {
      return errorResponse(err.message, 400, err.details);
    }
    throw err;
  }
}

// GET /api/v1/affiliates/me/links
export async function handleMyLinks(request: Request): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "affiliate") {
    return errorResponse("This endpoint is for affiliates", 403);
  }

  // Get all enrollments
  const enrollments = await db
    .select()
    .from(programAffiliates)
    .where(eq(programAffiliates.affiliate_id, user.userId));

  // Get all links for these enrollments
  const allLinks: any[] = [];
  for (const enrollment of enrollments) {
    const enrollmentLinks = await db
      .select()
      .from(links)
      .where(eq(links.program_affiliate_id, enrollment.id));

    allLinks.push(...enrollmentLinks);
  }

  return jsonResponse(allLinks);
}
