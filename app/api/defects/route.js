import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";
import { createNotification } from "lib/notify";

const schema = z.object({
  project_id: z.string().uuid(),
  work_task_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]).optional(),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().optional(),
});

export const GET = withPermission(PERMISSIONS.DEFECT_VIEW, async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const offset = (page - 1) * limit;
    const project_id = searchParams.get("project_id");
    const work_task_id = searchParams.get("work_task_id");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const search = searchParams.get("search") ?? "";

    let where = [];
    let params = [];
    let idx = 1;

    if (project_id) { where.push(`d.project_id = $${idx++}`); params.push(project_id); }
    if (work_task_id) { where.push(`d.work_task_id = $${idx++}`); params.push(work_task_id); }
    if (status) { where.push(`d.status = $${idx++}`); params.push(status); }
    if (severity) { where.push(`d.severity = $${idx++}`); params.push(severity); }
    if (search) { where.push(`d.title ILIKE $${idx++}`); params.push(`%${search}%`); }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows, countRes] = await Promise.all([
      query(
        `SELECT d.*,
                u.first_name || ' ' || u.last_name AS assigned_to_name,
                p.name AS project_name
         FROM defects d
         LEFT JOIN users u ON u.id = d.assigned_to
         LEFT JOIN projects p ON p.id = d.project_id
         ${whereClause} ORDER BY d.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM defects d ${whereClause}`, params),
    ]);
    return ApiResponse.success(rows.rows, "Defects fetched", paginationMeta(Number(countRes.rows[0].count), page, limit));
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const POST = withPermission(PERMISSIONS.DEFECT_CREATE, async (req, _ctx, session) => {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const { rows } = await query(
      `INSERT INTO defects (project_id, work_task_id, location_id, title, description, severity, assigned_to, due_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [d.project_id, d.work_task_id, d.location_id, d.title, d.description, d.severity ?? "MEDIUM", d.assigned_to, d.due_date, session.user.id]
    );
    const defect = rows[0];
    if (defect.assigned_to && defect.assigned_to !== session.user.id) {
      await createNotification({
        userId: defect.assigned_to,
        title: "ได้รับมอบหมายข้อบกพร่อง",
        message: `มีข้อบกพร่องใหม่ที่ได้รับมอบหมายให้คุณ: "${defect.title}"`,
        type: "defect",
        link: defect.work_task_id ? `/my-tasks/${defect.work_task_id}` : `/defects`,
      });
    }
    return ApiResponse.created(defect);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
