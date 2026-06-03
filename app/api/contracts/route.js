import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const schema = z.object({
  project_id: z.string().uuid(),
  contractor_id: z.string().uuid(),
  contract_no: z.string().optional(),
  title: z.string().min(1),
  contract_value: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  penalty_per_day: z.number().optional(),
  status: z.enum(["DRAFT","ACTIVE","COMPLETED","TERMINATED"]).optional(),
});

export const GET = withPermission(PERMISSIONS.CONTRACT_VIEW, async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const offset = (page - 1) * limit;
    const project_id = searchParams.get("project_id");

    const where = project_id ? "WHERE c.project_id = $3" : "";
    const params = project_id ? [limit, offset, project_id] : [limit, offset];

    const [rows, countRes] = await Promise.all([
      query(
        `SELECT c.*, p.name AS project_name, ct.company_name AS contractor_name
         FROM contracts c
         LEFT JOIN projects p ON p.id = c.project_id
         LEFT JOIN contractors ct ON ct.id = c.contractor_id
         ${where} ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      query(`SELECT COUNT(*) FROM contracts c ${where}`, project_id ? [project_id] : []),
    ]);
    return ApiResponse.success(rows.rows, "Contracts fetched", paginationMeta(Number(countRes.rows[0].count), page, limit));
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const POST = withPermission(PERMISSIONS.CONTRACT_CREATE, async (req) => {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const { rows } = await query(
      `INSERT INTO contracts (project_id, contractor_id, contract_no, title, contract_value, start_date, end_date, penalty_per_day, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [d.project_id, d.contractor_id, d.contract_no, d.title, d.contract_value, d.start_date, d.end_date, d.penalty_per_day, d.status ?? "DRAFT"]
    );
    return ApiResponse.created(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
