import { eq } from "drizzle-orm";
import { db } from "../db/connection";
import { businesses } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { jsonResponse, errorResponse, parseBody, BodyError } from "../lib/response";
import { businessUpdateSchema } from "@ascnd/shared/schemas";

export async function handleGetBusiness(
  request: Request,
  businessId: string
): Promise<Response> {
  const user = await requireAuth(request);

  // Only the business owner can view
  if (user.userType !== "business" || user.userId !== businessId) {
    return errorResponse("Forbidden", 403);
  }

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) return errorResponse("Business not found", 404);

  return jsonResponse({
    id: business.id,
    email: business.email,
    company_name: business.company_name,
    website: business.website,
    logo_url: business.logo_url,
    api_key: business.api_key,
    created_at: business.created_at,
    updated_at: business.updated_at,
  });
}

export async function handleUpdateBusiness(
  request: Request,
  businessId: string
): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "business" || user.userId !== businessId) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const body = await parseBody(request, businessUpdateSchema);

    const updateData: Record<string, unknown> = {};
    if (body.company_name !== undefined) updateData.company_name = body.company_name;
    if (body.website !== undefined) updateData.website = body.website || null;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url || null;
    updateData.updated_at = new Date().toISOString();

    await db
      .update(businesses)
      .set(updateData)
      .where(eq(businesses.id, businessId));

    const [updated] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    return jsonResponse({
      id: updated!.id,
      email: updated!.email,
      company_name: updated!.company_name,
      website: updated!.website,
      logo_url: updated!.logo_url,
      api_key: updated!.api_key,
      created_at: updated!.created_at,
      updated_at: updated!.updated_at,
    });
  } catch (err) {
    if (err instanceof BodyError) {
      return errorResponse(err.message, 400, err.details);
    }
    throw err;
  }
}

export async function handleBusinessDashboard(
  request: Request,
  businessId: string
): Promise<Response> {
  const user = await requireAuth(request);

  if (user.userType !== "business" || user.userId !== businessId) {
    return errorResponse("Forbidden", 403);
  }

  // Stub: return zeroes for now
  return jsonResponse({
    total_gmv: 0,
    active_affiliates: 0,
    conversion_rate: 0,
    pending_commissions: 0,
    programs_count: 0,
    total_clicks: 0,
  });
}
