import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  budget: z.number().positive().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(["PLANNING","ACTIVE","ON_HOLD","COMPLETED","CANCELLED"]).optional(),
});

export const GET = withPermission(PERMISSIONS.PROJECT_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const { rows } = await query(
      `SELECT p.*, u.first_name || ' ' || u.last_name AS created_by_name,
              (SELECT COUNT(*) FROM work_tasks WHERE project_id = p.id AND deleted_at IS NULL) AS task_count,
              (SELECT COALESCE(SUM(budget_cost), 0) FROM work_tasks WHERE project_id = p.id AND level = 2 AND deleted_at IS NULL) AS tasks_budget,
              (SELECT COALESCE(SUM(actual_cost), 0) FROM work_tasks WHERE project_id = p.id AND deleted_at IS NULL) AS tasks_actual_cost,
              (SELECT COUNT(*) FROM defects WHERE project_id = p.id) AS defect_count,
              (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       WHERE p.id = $1`,
      [id]
    );
    if (!rows[0]) return ApiResponse.notFound("Project not found");
    return ApiResponse.success(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch project", err);
  }
});

export const PATCH = withPermission(PERMISSIONS.PROJECT_UPDATE, async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);

    const fields = Object.keys(parsed.data);
    if (fields.length === 0) return ApiResponse.badRequest("No fields to update");
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const { rows } = await query(
      `UPDATE projects SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...fields.map((f) => parsed.data[f])]
    );
    if (!rows[0]) return ApiResponse.notFound("Project not found");
    return ApiResponse.success(rows[0], "Project updated");
  } catch (err) {
    return ApiResponse.serverError("Failed to update project", err);
  }
});

export const DELETE = withPermission(PERMISSIONS.PROJECT_DELETE, async (_req, { params }) => {
  try {
    const { id } = await params;
    await query(`DELETE FROM projects WHERE id = $1`, [id]);
    return ApiResponse.success(null, "Project deleted");
  } catch (err) {
    return ApiResponse.serverError("Failed to delete project", err);
  }
});
