import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query, withTransaction } from "lib/db";
import { PERMISSIONS } from "constants/permissions";
import { notifyMany } from "lib/notify";

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  wbs_code: z.string().optional(),
  sort_order: z.coerce.number().int().optional(),
  location_id: z.string().uuid().optional(),
  budget_cost: z.number().optional(),
  actual_cost: z.number().optional(),
  planned_start: z.string().optional(),
  planned_end: z.string().optional(),
  actual_start: z.string().optional(),
  actual_end: z.string().optional(),
  progress_percent: z.number().min(0).max(100).optional(),
  status: z.enum(["PENDING","IN_PROGRESS","DONE","CANCELLED"]).optional(),
  assigned_to: z.string().uuid().optional(),
  assigned_contractor_id: z.string().uuid().optional(),
  assignees: z.array(z.string().uuid()).optional(),
});

export const GET = withPermission(PERMISSIONS.TASK_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const [taskRes, logsRes] = await Promise.all([
      query(
        `SELECT t.*, u.first_name || ' ' || u.last_name AS assigned_to_name,
                p.name AS project_name
         FROM work_tasks t
         LEFT JOIN users u ON u.id = t.assigned_to
         LEFT JOIN projects p ON p.id = t.project_id
         WHERE t.id = $1 AND t.deleted_at IS NULL`,
        [id]
      ),
      query(
        `SELECT l.*, u.first_name || ' ' || u.last_name AS created_by_name
         FROM work_task_progress_logs l
         LEFT JOIN users u ON u.id = l.created_by
         WHERE l.work_task_id = $1 ORDER BY l.created_at DESC`,
        [id]
      ),
    ]);
    if (!taskRes.rows[0]) return ApiResponse.notFound();
    return ApiResponse.success({ ...taskRes.rows[0], progress_logs: logsRes.rows });
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const PATCH = withPermission(PERMISSIONS.TASK_UPDATE, async (req, { params }, session) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);

    const { progress_percent, assignees, ...rest } = parsed.data;
    const fields = Object.keys(rest);

    if (progress_percent !== undefined) {
      fields.push("progress_percent");
      rest.progress_percent = progress_percent;
    }

    const result = await withTransaction(async (client) => {
      let taskRow;
      if (fields.length) {
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
        const { rows } = await client.query(
          `UPDATE work_tasks SET ${setClause} WHERE id = $1 RETURNING *`,
          [id, ...fields.map((f) => rest[f])]
        );
        taskRow = rows[0];
      } else {
        const { rows } = await client.query(`SELECT * FROM work_tasks WHERE id = $1`, [id]);
        taskRow = rows[0];
      }

      if (progress_percent !== undefined) {
        await client.query(
          `INSERT INTO work_task_progress_logs (work_task_id, progress_percent, created_by) VALUES ($1, $2, $3)`,
          [id, progress_percent, session.user.id]
        );
      }

      if (assignees !== undefined) {
        await client.query(`DELETE FROM work_task_assignees WHERE task_id = $1`, [id]);
        if (assignees.length > 0) {
          await client.query(
            `INSERT INTO work_task_assignees (task_id, user_id) SELECT $1, unnest($2::uuid[]) ON CONFLICT DO NOTHING`,
            [id, assignees]
          );
        }
      }

      return { taskRow, newAssignees: assignees };
    });

    if (!result) return ApiResponse.notFound();
    if (result.newAssignees?.length) {
      const others = result.newAssignees.filter((uid) => uid !== session.user.id);
      await notifyMany(others, {
        title: "ได้รับมอบหมายงานใหม่",
        message: `คุณได้รับมอบหมายให้ดูแลงาน: "${result.taskRow?.title ?? id}"`,
        type: "task",
        link: `/my-tasks/${id}`,
      });
    }
    return ApiResponse.success(result.taskRow, "Task updated");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const DELETE = withPermission(PERMISSIONS.TASK_DELETE, async (_req, { params }) => {
  try {
    const { id } = await params;
    await query(
      `WITH RECURSIVE descendants AS (
         SELECT id FROM work_tasks WHERE id = $1
         UNION ALL
         SELECT t.id FROM work_tasks t
         INNER JOIN descendants d ON t.parent_id = d.id
         WHERE t.deleted_at IS NULL
       )
       UPDATE work_tasks SET deleted_at = NOW()
       WHERE id IN (SELECT id FROM descendants)`,
      [id]
    );
    return ApiResponse.success(null, "Task deleted");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
