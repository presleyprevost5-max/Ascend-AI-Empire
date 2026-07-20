import { eq, and } from "drizzle-orm";
import { db } from "../db/connection";
import { programs, programAffiliates } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { jsonResponse, errorResponse, parseBody, BodyError } from "../lib/response";
import { programCreateSchema, programUpdateSchema } from "@ascnd/shared/schemas";
import { generateId } from "../lib/id";

export async function handleCreateProgram(request: Request): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "business") {
    return errorResponse("Only businesses can create programs", 403);
  }

  try {
    const body = await parseBody(request, programCreateSchema);

    const programId = generateId();
    const now = new Date().toISOString();

    await db.insert(programs).values({
      id: programId,
      business_id: user.userId,
      name: body.name,
      commission_rate: body.commission_rate,
      description: body.description ?? null,
      commission_type: body.commission_type ?? "recurring",
      recurring_months: body.recurring_months ?? null,
      cookie_days: body.cookie_days ?? 30,
      min_payout: body.min_payout ?? 50,
      signup_url: body.signup_url || null,
      created_at: now,
      updated_at: now,
    });

    const [program] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    return new Response(JSON.stringify(program), { status: 201 });
  } catch (err) {
    if (err instanceof BodyError) {
      return errorResponse(err.message, 400, err.details);
    }
    throw err;
  }
}

export async function handleListBusinessPrograms(
  request: Request,
  businessId: string
): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "business" || user.userId !== businessId) {
    return errorResponse("Forbidden", 403);
  }

  const programsList = await db
    .select()
    .from(programs)
    .where(eq(programs.business_id, businessId));

  // For each program, count affiliates
  const result = await Promise.all(
    programsList.map(async (p) => {
      const affiliates = await db
        .select()
        .from(programAffiliates)
        .where(
          and(
            eq(programAffiliates.program_id, p.id),
            eq(programAffiliates.status, "approved")
          )
        );

      return {
        ...p,
        is_active: !!p.is_active,
        affiliate_count: affiliates.length,
      };
    })
  );

  return jsonResponse(result);
}

export async function handleGetProgram(
  request: Request,
  programId: string
): Promise<Response> {
  const user = await requireAuth(request);

  const [program] = await db
    .select()
    .from(programs)
    .where(eq(programs.id, programId))
    .limit(1);

  if (!program) return errorResponse("Program not found", 404);

  // Allow business owner or enrolled affiliate
  if (user.userType === "business" && program.business_id === user.userId) {
    return jsonResponse({ ...program, is_active: !!program.is_active });
  }

  if (user.userType === "affiliate") {
    const [enrollment] = await db
      .select()
      .from(programAffiliates)
      .where(
        and(
          eq(programAffiliates.program_id, programId),
          eq(programAffiliates.affiliate_id, user.userId),
          eq(programAffiliates.status, "approved")
        )
      )
      .limit(1);

    if (enrollment) {
      return jsonResponse({ ...program, is_active: !!program.is_active });
    }
  }

  return errorResponse("Forbidden", 403);
}

export async function handleUpdateProgram(
  request: Request,
  programId: string
): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "business") {
    return errorResponse("Only businesses can update programs", 403);
  }

  const [program] = await db
    .select()
    .from(programs)
    .where(eq(programs.id, programId))
    .limit(1);

  if (!program) return errorResponse("Program not found", 404);
  if (program.business_id !== user.userId) return errorResponse("Forbidden", 403);

  try {
    const body = await parseBody(request, programUpdateSchema);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.commission_rate !== undefined) updateData.commission_rate = body.commission_rate;
    if (body.commission_type !== undefined) updateData.commission_type = body.commission_type;
    if (body.recurring_months !== undefined) updateData.recurring_months = body.recurring_months;
    if (body.cookie_days !== undefined) updateData.cookie_days = body.cookie_days;
    if (body.min_payout !== undefined) updateData.min_payout = body.min_payout;
    if (body.signup_url !== undefined) updateData.signup_url = body.signup_url || null;

    await db.update(programs).set(updateData).where(eq(programs.id, programId));

    const [updated] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    return jsonResponse({ ...updated, is_active: !!updated!.is_active });
  } catch (err) {
    if (err instanceof BodyError) {
      return errorResponse(err.message, 400, err.details);
    }
    throw err;
  }
}

export async function handleDeactivateProgram(
  request: Request,
  programId: string
): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "business") {
    return errorResponse("Only businesses can deactivate programs", 403);
  }

  const [program] = await db
    .select()
    .from(programs)
    .where(eq(programs.id, programId))
    .limit(1);

  if (!program) return errorResponse("Program not found", 404);
  if (program.business_id !== user.userId) return errorResponse("Forbidden", 403);

  await db
    .update(programs)
    .set({ is_active: 0, updated_at: new Date().toISOString() })
    .where(eq(programs.id, programId));

  return jsonResponse({ ok: true });
}
