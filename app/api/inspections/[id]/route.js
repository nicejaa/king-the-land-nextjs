import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const updateSchema = z.object({
  inspection_date: z.string().optional(),
  passed: z.boolean().optional(),
  remark: z.string().optional(),
});

export const PATCH = withPermission(PERMISSIONS.INSPECTION_VERIFY, async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const fields = Object.keys(parsed.data);
    if (!fields.length) return ApiResponse.badRequest();
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const { rows } = await query(
      `UPDATE inspections SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...fields.map((f) => parsed.data[f])]
    );
    return ApiResponse.success(rows[0], "Inspection updated");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const DELETE = withPermission(PERMISSIONS.INSPECTION_CREATE, async (_req, { params }) => {
  try {
    const { id } = await params;
    await query(`DELETE FROM inspections WHERE id = $1`, [id]);
    return ApiResponse.success(null, "Inspection deleted");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
