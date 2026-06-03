import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const updateSchema = z.object({
  company_name: z.string().min(1).optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  username: z.string().optional(),
  address: z.string().optional(),
});

export const GET = withPermission(PERMISSIONS.CONTRACTOR_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const { rows } = await query(`SELECT * FROM contractors WHERE id = $1`, [id]);
    if (!rows[0]) return ApiResponse.notFound();
    return ApiResponse.success(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const PATCH = withPermission(PERMISSIONS.CONTRACTOR_UPDATE, async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const fields = Object.keys(parsed.data);
    if (!fields.length) return ApiResponse.badRequest();
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const { rows } = await query(
      `UPDATE contractors SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...fields.map((f) => parsed.data[f])]
    );
    return ApiResponse.success(rows[0], "Contractor updated");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const DELETE = withPermission(PERMISSIONS.CONTRACTOR_DELETE, async (_req, { params }) => {
  try {
    const { id } = await params;
    await query(`DELETE FROM contractors WHERE id = $1`, [id]);
    return ApiResponse.success(null, "Contractor deleted");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
