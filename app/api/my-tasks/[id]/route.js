import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query, withTransaction } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const updateSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  progress_percent: z.number().min(0).max(100).optional(),
});

export const GET = withPermission(PERMISSIONS.MY_TASK_VIEW, async (_req, { params }, session) => {
  try {
    const { id } = await params;
    const userId = session.user.id;

    const { rows } = await query(
      `SELECT t.*, p.name AS project_name,
              u.first_name || ' ' || u.last_name AS assigned_to_name
       FROM work_tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assigned_to
       WHERE t.id = $1
         AND t.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM work_task_assignees a
           WHERE a.task_id = t.id AND a.user_id = $2
         )`,
      [id, userId]
    );

    if (!rows[0]) return ApiResponse.notFound("ไม่พบงาน หรือไม่มีสิทธิ์เข้าถึง");
    return ApiResponse.success(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch task", err);
  }
});

export const PATCH = withPermission(PERMISSIONS.MY_TASK_VIEW, async (req, { params }, session) => {
  try {
    const { id } = await params;
    const userId = session.user.id;

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);

    const { status, progress_percent } = parsed.data;

    const result = await withTransaction(async (client) => {
      const ownerCheck = await client.query(
        `SELECT t.id FROM work_tasks t
         JOIN work_task_assignees a ON a.task_id = t.id
         WHERE t.id = $1 AND a.user_id = $2 AND t.deleted_at IS NULL`,
        [id, userId]
      );
      if (!ownerCheck.rows[0]) return null;

      const fields = [];
      const values = [id];
      let idx = 2;

      if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }
      if (progress_percent !== undefined) { fields.push(`progress_percent = $${idx++}`); values.push(progress_percent); }

      if (fields.length) {
        await client.query(
          `UPDATE work_tasks SET ${fields.join(", ")} WHERE id = $1`,
          values
        );
      }

      if (progress_percent !== undefined) {
        await client.query(
          `INSERT INTO work_task_progress_logs (work_task_id, progress_percent, created_by) VALUES ($1, $2, $3)`,
          [id, progress_percent, userId]
        );
      }

      const { rows } = await client.query(`SELECT * FROM work_tasks WHERE id = $1`, [id]);
      return rows[0];
    });

    if (!result) return ApiResponse.notFound("ไม่พบงาน หรือไม่มีสิทธิ์เข้าถึง");
    return ApiResponse.success(result, "อัพเดทแล้ว");
  } catch (err) {
    return ApiResponse.serverError("Failed to update task", err);
  }
});
