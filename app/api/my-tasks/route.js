import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

export const GET = withPermission(PERMISSIONS.MY_TASK_VIEW, async (req, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 50));
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";

    const userId = session.user.id;

    let where = [`t.deleted_at IS NULL`, `wta.user_id = $1`];
    let params = [userId];
    let idx = 2;

    if (search) { where.push(`t.title ILIKE $${idx++}`); params.push(`%${search}%`); }
    if (status) { where.push(`t.status = $${idx++}`); params.push(status); }

    const whereClause = `WHERE ${where.join(" AND ")}`;
    console.log(whereClause);
    
    const [rows, countRes] = await Promise.all([
      query(
        `SELECT t.*,
                p.name AS project_name,
                parent.title AS parent_title,
                (SELECT COUNT(*) FROM work_task_comments WHERE task_id = t.id) AS comment_count,
                (SELECT COUNT(*) FROM work_task_attachments WHERE task_id = t.id) AS attachment_count
         FROM work_tasks t
         JOIN work_task_assignees wta ON wta.task_id = t.id
         LEFT JOIN projects p ON p.id = t.project_id
         LEFT JOIN work_tasks parent ON parent.id = t.parent_id
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*) FROM work_tasks t JOIN work_task_assignees wta ON wta.task_id = t.id ${whereClause}`,
        params
      ),
    ]);

    return ApiResponse.success(rows.rows, "My tasks fetched", paginationMeta(Number(countRes.rows[0].count), page, limit));
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch my tasks", err);
  }
});
