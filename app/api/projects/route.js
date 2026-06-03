import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  budget: z.number().positive().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z
    .enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"])
    .optional(),
});

export const GET = withPermission(PERMISSIONS.PROJECT_VIEW, async (req, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const offset = (page - 1) * limit;

    let where = [];
    let params = [];
    let idx = 1;

    if (search) { where.push(`(p.name ILIKE $${idx} OR p.description ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    if (status) { where.push(`p.status = $${idx}`); params.push(status); idx++; }

    const { role, id: userId } = session.user;
    if (role === "PROJECT_MANAGER") {
      where.push(`p.id IN (SELECT project_id FROM project_members WHERE user_id = $${idx++})`);
      params.push(userId);
    } else if (role === "CONTRACTOR_OWNER") {
      where.push(`p.id IN (SELECT DISTINCT project_id FROM work_tasks WHERE assigned_to = $${idx++} AND deleted_at IS NULL)`);
      params.push(userId);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows, countRes] = await Promise.all([
      query(
        `SELECT p.*, u.first_name || ' ' || u.last_name AS created_by_name
         FROM projects p
         LEFT JOIN users u ON u.id = p.created_by
         ${whereClause} ORDER BY p.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM projects p ${whereClause}`, params),
    ]);

    return ApiResponse.success(
      rows.rows,
      "Projects fetched",
      paginationMeta(Number(countRes.rows[0].count), page, limit)
    );
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch projects", err);
  }
});

export const POST = withPermission(PERMISSIONS.PROJECT_CREATE, async (req, _ctx, session) => {
  try {
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const { name, description, budget, start_date, end_date, status } = parsed.data;

    const { rows } = await query(
      `INSERT INTO projects (name, description, budget, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, budget, start_date, end_date, status ?? "PLANNING", session.user.id]
    );
    return ApiResponse.created(rows[0], "Project created");
  } catch (err) {
    return ApiResponse.serverError("Failed to create project", err);
  }
});
