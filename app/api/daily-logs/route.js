import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const schema = z.object({
  project_id: z.string().uuid(),
  work_task_id: z.string().uuid().optional(),
  log_date: z.string(),
  weather: z.string().optional(),
  manpower_count: z.number().int().optional(),
  note: z.string().optional(),
});

const SUPER_ROLES      = ["SUPER_ADMIN", "SITE_ENGINEER"];
const PM_SCOPED_ROLES  = ["PROJECT_MANAGER"];
const CONTRACTOR_ROLES = ["CONTRACTOR", "CONTRACTOR_OWNER"];

export const GET = withPermission(PERMISSIONS.DAILY_LOG_VIEW, async (req, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const offset = (page - 1) * limit;
    const project_id = searchParams.get("project_id");

    let where = [];
    let params = [];
    let idx = 1;

    if (project_id) { where.push(`d.project_id = $${idx++}`); params.push(project_id); }

    const { role, id: userId, contractor_id } = session.user;
    if (SUPER_ROLES.includes(role)) {
      // sees everything
    } else if (PM_SCOPED_ROLES.includes(role)) {
      where.push(`d.project_id IN (SELECT project_id FROM project_members WHERE user_id = $${idx++})`);
      params.push(userId);
    } else if (CONTRACTOR_ROLES.includes(role) && contractor_id) {
      where.push(`d.created_by IN (SELECT id FROM users WHERE contractor_id = $${idx++})`);
      params.push(contractor_id);
    } else {
      where.push(`d.created_by = $${idx++}`);
      params.push(userId);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows, countRes] = await Promise.all([
      query(
        `SELECT d.*, p.name AS project_name, u.first_name || ' ' || u.last_name AS created_by_name
         FROM daily_logs d
         LEFT JOIN projects p ON p.id = d.project_id
         LEFT JOIN users u ON u.id = d.created_by
         ${whereClause} ORDER BY d.log_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM daily_logs d ${whereClause}`, params),
    ]);
    return ApiResponse.success(rows.rows, "Daily logs fetched", paginationMeta(Number(countRes.rows[0].count), page, limit));
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const POST = withPermission(PERMISSIONS.DAILY_LOG_CREATE, async (req, _ctx, session) => {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const { rows } = await query(
      `INSERT INTO daily_logs (project_id, work_task_id, log_date, weather, manpower_count, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [d.project_id, d.work_task_id, d.log_date, d.weather, d.manpower_count, d.note, session.user.id]
    );
    return ApiResponse.created(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
