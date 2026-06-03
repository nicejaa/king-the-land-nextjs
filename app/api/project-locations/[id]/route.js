import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  location_type: z.enum(["ZONE", "BUILDING", "FLOOR", "ROOM"]).optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

export const PATCH = withPermission(PERMISSIONS.LOCATION_UPDATE, async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);

    const fields = Object.keys(parsed.data);
    if (!fields.length) return ApiResponse.badRequest("No fields to update");
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const { rows } = await query(
      `UPDATE project_locations SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...fields.map((f) => parsed.data[f])]
    );
    if (!rows[0]) return ApiResponse.notFound();
    return ApiResponse.success(rows[0], "Location updated");
  } catch (err) {
    return ApiResponse.serverError("Failed to update location", err);
  }
});

export const DELETE = withPermission(PERMISSIONS.LOCATION_DELETE, async (_req, { params }) => {
  try {
    const { id } = await params;
    await query(`DELETE FROM project_locations WHERE id = $1`, [id]);
    return ApiResponse.success(null, "Location deleted");
  } catch (err) {
    return ApiResponse.serverError("Failed to delete location", err);
  }
});
