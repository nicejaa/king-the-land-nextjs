import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const schema = z.object({
  work_task_id: z.string().uuid(),
  inspection_date: z.string(),
  passed: z.boolean(),
  remark: z.string().optional(),
});

export const GET = withPermission(PERMISSIONS.INSPECTION_VIEW, async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const offset = (page - 1) * limit;

    const [rows, countRes] = await Promise.all([
      query(
        `SELECT i.*, t.title AS task_title, u.first_name || ' ' || u.last_name AS inspected_by_name
         FROM inspections i
         LEFT JOIN work_tasks t ON t.id = i.work_task_id
         LEFT JOIN users u ON u.id = i.inspected_by
         ORDER BY i.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query(`SELECT COUNT(*) FROM inspections`),
    ]);
    return ApiResponse.success(rows.rows, "Inspections fetched", paginationMeta(Number(countRes.rows[0].count), page, limit));
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const POST = withPermission(PERMISSIONS.INSPECTION_CREATE, async (req, _ctx, session) => {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const { rows } = await query(
      `INSERT INTO inspections (work_task_id, inspected_by, inspection_date, passed, remark)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [d.work_task_id, session.user.id, d.inspection_date, d.passed, d.remark]
    );
    return ApiResponse.created(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
