import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const addMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: z.string().min(1),
});

export const GET = withPermission(PERMISSIONS.PROJECT_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const { rows } = await query(
      `SELECT pm.*, u.first_name || ' ' || u.last_name AS name, u.username, u.role AS user_role
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [id]
    );
    return ApiResponse.success(rows);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const POST = withPermission(PERMISSIONS.PROJECT_UPDATE, async (req, { params }, session) => {
  try {
    if (session.user.role !== "SUPER_ADMIN") return ApiResponse.forbidden();
    const { id } = await params;
    const body = await req.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);

    const { rows } = await query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [id, parsed.data.user_id, parsed.data.role]
    );
    return ApiResponse.created(rows[0], "Member added");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const DELETE = withPermission(PERMISSIONS.PROJECT_UPDATE, async (req, { params }, session) => {
  try {
    if (session.user.role !== "SUPER_ADMIN") return ApiResponse.forbidden();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    if (!user_id) return ApiResponse.badRequest("user_id required");

    await query(`DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`, [id, user_id]);
    return ApiResponse.success(null, "Member removed");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
