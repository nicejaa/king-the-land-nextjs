import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";
import { getTaskAssignees, notifyMany } from "lib/notify";

export const GET = withPermission(PERMISSIONS.MY_TASK_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const { rows } = await query(
      `SELECT c.*, u.first_name || ' ' || u.last_name AS author_name, u.role AS author_role
       FROM work_task_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );
    return ApiResponse.success(rows);
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch comments", err);
  }
});

export const POST = withPermission(PERMISSIONS.MY_TASK_VIEW, async (req, { params }, session) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = z.object({ content: z.string().min(1) }).safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);

    const [{ rows }, assignees] = await Promise.all([
      query(
        `INSERT INTO work_task_comments (task_id, user_id, content) VALUES ($1, $2, $3)
         RETURNING *, (SELECT first_name || ' ' || last_name FROM users WHERE id = $2) AS author_name`,
        [id, session.user.id, parsed.data.content]
      ),
      getTaskAssignees(id),
    ]);
    const others = assignees.filter((uid) => uid !== session.user.id);
    if (others.length) {
      const taskRes = await query(`SELECT title FROM work_tasks WHERE id = $1`, [id]);
      await notifyMany(others, {
        title: "มีคอมเมนต์ใหม่ในงานของคุณ",
        message: `${rows[0].author_name} คอมเมนต์ในงาน "${taskRes.rows[0]?.title ?? id}": ${parsed.data.content.slice(0, 60)}${parsed.data.content.length > 60 ? "..." : ""}`,
        type: "comment",
        link: `/my-tasks/${id}`,
      });
    }
    return ApiResponse.created(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("Failed to create comment", err);
  }
});
