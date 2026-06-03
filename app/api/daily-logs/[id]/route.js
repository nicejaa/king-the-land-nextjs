import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const updateSchema = z.object({
  log_date: z.string().optional(),
  weather: z.string().optional(),
  manpower_count: z.number().int().optional(),
  note: z.string().optional(),
});

export const GET = withPermission(PERMISSIONS.DAILY_LOG_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const { rows } = await query(`SELECT * FROM daily_logs WHERE id = $1`, [id]);
    if (!rows[0]) return ApiResponse.notFound();
    return ApiResponse.success(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const PATCH = withPermission(PERMISSIONS.DAILY_LOG_UPDATE, async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const fields = Object.keys(parsed.data);
    if (!fields.length) return ApiResponse.badRequest();
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const { rows } = await query(`UPDATE daily_logs SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...fields.map((f) => parsed.data[f])]);
    return ApiResponse.success(rows[0], "Daily log updated");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const DELETE = withPermission(PERMISSIONS.DAILY_LOG_DELETE, async (_req, { params }) => {
  try {
    const { id } = await params;
    await query(`DELETE FROM daily_logs WHERE id = $1`, [id]);
    return ApiResponse.success(null, "Daily log deleted");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
