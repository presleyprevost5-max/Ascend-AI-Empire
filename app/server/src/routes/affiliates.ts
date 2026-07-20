import { eq, and } from "drizzle-orm";
import { db } from "../db/connection";
import { affiliates, programs, programAffiliates } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { jsonResponse, errorResponse, parseBody, BodyError } from "../lib/response";
import { affiliateUpdateSchema, affiliateApprovalSchema } from "@ascnd/shared/schemas";
import { generateId, generateShortCode } from "../lib/id";

// GET /api/v1/affiliates/me
export async function handleGetMyProfile(request: Request): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "affiliate") {
    return errorResponse("This endpoint is for affiliates", 403);
  }

  const [affiliate] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.id, user.userId))
    .limit(1);

  if (!affiliate) return errorResponse("Affiliate not found", 404);

  return jsonResponse({
    id: affiliate.id,
    email: affiliate.email,
    name: affiliate.name,
    bio: affiliate.bio,
    website: affiliate.website,
    payment_email: affiliate.payment_email,
    created_at: affiliate.created_at,
    updated_at: affiliate.updated_at,
  });
}

// PUT /api/v1/affiliates/me
export async function handleUpdateMyProfile(request: Request): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "affiliate") {
    return errorResponse("This endpoint is for affiliates", 403);
  }

  try {
    const body = await parseBody(request, affiliateUpdateSchema);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.website !== undefined) updateData.website = body.website || null;
    if (body.payment_email !== undefined) updateData.payment_email = body.payment_email;

    await db
      .update(affiliates)
      .set(updateData)
      .where(eq(affiliates.id, user.userId));

    const [updated] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, user.userId))
      .limit(1);

    return jsonResponse(updated);
  } catch (err) {
    if (err instanceof BodyError) {
      return errorResponse(err.message, 400, err.details);
    }
    throw err;
  }
}

// POST /api/v1/programs/:id/apply
export async function handleApplyToProgram(
  request: Request,
  programId: string
): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "affiliate") {
    return errorResponse("Only affiliates can apply to programs", 403);
  }

  const [program] = await db
    .select()
    .from(programs)
    .where(eq(programs.id, programId))
    .limit(1);

  if (!program) return errorResponse("Program not found", 404);
  if (!program.is_active) return errorResponse("Program is not active", 400);

  // Check existing enrollment
  const [existing] = await db
    .select()
    .from(programAffiliates)
    .where(
      and(
        eq(programAffiliates.program_id, programId),
        eq(programAffiliates.affiliate_id, user.userId)
      )
    )
    .limit(1);

  if (existing) {
    return errorResponse(
      `Already applied with status: ${existing.status}`,
      409
    );
  }

  const paId = generateId();
  const uniqueCode = generateShortCode();
  const now = new Date().toISOString();

  await db.insert(programAffiliates).values({
    id: paId,
    program_id: programId,
    affiliate_id: user.userId,
    unique_code: uniqueCode,
    status: "pending",
    created_at: now,
    updated_at: now,
  });

  return new Response(
    JSON.stringify({
      id: paId,
      program_id: programId,
      affiliate_id: user.userId,
      unique_code: uniqueCode,
      status: "pending",
    }),
    { status: 201 }
  );
}

// GET /api/v1/affiliates/me/programs
export async function handleMyPrograms(request: Request): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "affiliate") {
    return errorResponse("This endpoint is for affiliates", 403);
  }

  const enrollments = await db
    .select()
    .from(programAffiliates)
    .where(eq(programAffiliates.affiliate_id, user.userId));

  // Enrich with program details
  const result = await Promise.all(
    enrollments.map(async (enrollment) => {
      const [program] = await db
        .select()
        .from(programs)
        .where(eq(programs.id, enrollment.program_id))
        .limit(1);

      return {
        ...enrollment,
        program: program || null,
      };
    })
  );

  return jsonResponse(result);
}

// PUT /api/v1/programs/:id/affiliates/:affiliateId
export async function handleApproveRejectAffiliate(
  request: Request,
  programId: string,
  affiliateId: string
): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "business") {
    return errorResponse("Only businesses can manage affiliates", 403);
  }

  // Verify program ownership
  const [program] = await db
    .select()
    .from(programs)
    .where(eq(programs.id, programId))
    .limit(1);

  if (!program) return errorResponse("Program not found", 404);
  if (program.business_id !== user.userId) return errorResponse("Forbidden", 403);

  try {
    const body = await parseBody(request, affiliateApprovalSchema);

    await db
      .update(programAffiliates)
      .set({
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .where(
        and(
          eq(programAffiliates.program_id, programId),
          eq(programAffiliates.affiliate_id, affiliateId)
        )
      );

    const [updated] = await db
      .select()
      .from(programAffiliates)
      .where(
        and(
          eq(programAffiliates.program_id, programId),
          eq(programAffiliates.affiliate_id, affiliateId)
        )
      )
      .limit(1);

    if (!updated) return errorResponse("Enrollment not found", 404);

    return jsonResponse(updated);
  } catch (err) {
    if (err instanceof BodyError) {
      return errorResponse(err.message, 400, err.details);
    }
    throw err;
  }
}
