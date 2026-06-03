import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query, withTransaction } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const schema = z.object({
  project_id: z.string().uuid(),
  parent_id: z.string().uuid().optional(),
  level: z.coerce.number().int().min(1).max(3).default(3),
  wbs_code: z.string().optional(),
  sort_order: z.coerce.number().int().optional(),
  contract_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  budget_cost: z.number().optional(),
  planned_start: z.string().optional(),
  planned_end: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  assigned_contractor_id: z.string().uuid().optional(),
  assignees: z.array(z.string().uuid()).optional(),
  status: z.enum(["PENDING","IN_PROGRESS","DONE","CANCELLED"]).optional(),
});

const SUPER_ROLES     = ["SUPER_ADMIN", "SITE_ENGINEER"];
const PM_SCOPED_ROLES = ["PROJECT_MANAGER"];

export const GET = withPermission(PERMISSIONS.TASK_VIEW, async (req, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const offset = (page - 1) * limit;
    const project_id = searchParams.get("project_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search") ?? "";

    let where = [];
    let params = [];
    let idx = 1;

    where.push(`t.deleted_at IS NULL`);
    if (project_id) { where.push(`t.project_id = $${idx++}`); params.push(project_id); }
    if (status) { where.push(`t.status = $${idx++}`); params.push(status); }
    if (search) { where.push(`t.title ILIKE $${idx++}`); params.push(`%${search}%`); }

    const { role, id: userId } = session.user;
    if (SUPER_ROLES.includes(role)) {
      // sees everything
    } else if (PM_SCOPED_ROLES.includes(role)) {
      where.push(`t.project_id IN (SELECT project_id FROM project_members WHERE user_id = $${idx++})`);
      params.push(userId);
    } else if (role === "CONTRACTOR_OWNER") {
      // sees Level 2 tasks assigned to them + Level 3 children of those tasks
      where.push(`t.id IN (
        SELECT id FROM work_tasks WHERE assigned_to = $${idx} AND deleted_at IS NULL
        UNION ALL
        SELECT wt3.id FROM work_tasks wt3 WHERE wt3.deleted_at IS NULL
          AND wt3.parent_id IN (SELECT id FROM work_tasks WHERE assigned_to = $${idx} AND deleted_at IS NULL)
      )`);
      params.push(userId);
      idx++;
    } else {
      where.push(`t.assigned_to = $${idx++}`);
      params.push(userId);
    }

    const whereClause = `WHERE ${where.join(" AND ")}`;

    const [rows, countRes] = await Promise.all([
      query(
        `SELECT t.*,
                p.name AS project_name,
                u.first_name || ' ' || u.last_name AS assigned_to_name,
                c.company_name AS assigned_contractor_name,
                COALESCE((
                  SELECT json_agg(json_build_object('id', au.id, 'name', au.first_name || ' ' || au.last_name, 'role', au.role::text) ORDER BY au.first_name)
                  FROM work_task_assignees wta
                  JOIN users au ON au.id = wta.user_id
                  WHERE wta.task_id = t.id
                ), '[]') AS assignees
         FROM work_tasks t
         LEFT JOIN projects p ON p.id = t.project_id
         LEFT JOIN users u ON u.id = t.assigned_to
         LEFT JOIN contractors c ON c.id = t.assigned_contractor_id
         ${whereClause}
         ORDER BY t.level ASC, t.sort_order ASC, t.wbs_code ASC, t.created_at ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM work_tasks t ${whereClause}`, params),
    ]);
    return ApiResponse.success(rows.rows, "Tasks fetched", paginationMeta(Number(countRes.rows[0].count), page, limit));
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const POST = withPermission(PERMISSIONS.TASK_CREATE, async (req, _ctx, session) => {
  try {
    
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO work_tasks (project_id, parent_id, level, wbs_code, sort_order, contract_id, location_id, title, description, budget_cost, planned_start, planned_end, assigned_to, assigned_contractor_id, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [d.project_id, d.parent_id ?? null, d.level ?? 3, d.wbs_code ?? null, d.sort_order ?? 0,
         d.contract_id ?? null, d.location_id ?? null, d.title, d.description ?? null,
         d.budget_cost ?? null, d.planned_start ?? null, d.planned_end ?? null,
         d.assigned_to ?? null, d.assigned_contractor_id ?? null, d.status ?? "PENDING", session.user.id]
      );
      const task = rows[0];
      if (d.assignees?.length) {
        await client.query(
          `INSERT INTO work_task_assignees (task_id, user_id) SELECT $1, unnest($2::uuid[]) ON CONFLICT DO NOTHING`,
          [task.id, d.assignees]
        );
      }
      return task;
    });
    return ApiResponse.created(result);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
