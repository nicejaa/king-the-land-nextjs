import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const schema = z.object({
  project_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  location_type: z.enum(["ZONE", "BUILDING", "FLOOR", "ROOM"]),
});

export const GET = withPermission(PERMISSIONS.LOCATION_VIEW, async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get("project_id");
    if (!project_id) return ApiResponse.badRequest("project_id is required");

    const { rows } = await query(
      `SELECT * FROM project_locations WHERE project_id = $1 ORDER BY name`,
      [project_id]
    );
    return ApiResponse.success(rows);
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch locations", err);
  }
});

export const POST = withPermission(PERMISSIONS.LOCATION_CREATE, async (req) => {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const { project_id, parent_id, name, location_type } = parsed.data;

    const { rows } = await query(
      `INSERT INTO project_locations (project_id, parent_id, name, location_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [project_id, parent_id ?? null, name, location_type]
    );
    return ApiResponse.created(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("Failed to create location", err);
  }
});
