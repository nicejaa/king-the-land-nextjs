import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const updateSchema = z.object({
  title: z.string().optional(),
  contract_value: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  penalty_per_day: z.number().optional(),
  status: z.enum(["DRAFT","ACTIVE","COMPLETED","TERMINATED"]).optional(),
});

export const GET = withPermission(PERMISSIONS.CONTRACT_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const [contractRes, milestonesRes] = await Promise.all([
      query(
        `SELECT c.*, p.name AS project_name, ct.company_name AS contractor_name
         FROM contracts c
         LEFT JOIN projects p ON p.id = c.project_id
         LEFT JOIN contractors ct ON ct.id = c.contractor_id
         WHERE c.id = $1`,
        [id]
      ),
      query(`SELECT * FROM payment_milestones WHERE contract_id = $1 ORDER BY due_date`, [id]),
    ]);
    if (!contractRes.rows[0]) return ApiResponse.notFound();
    return ApiResponse.success({ ...contractRes.rows[0], milestones: milestonesRes.rows });
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const PATCH = withPermission(PERMISSIONS.CONTRACT_UPDATE, async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const fields = Object.keys(parsed.data);
    if (!fields.length) return ApiResponse.badRequest();
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const { rows } = await query(
      `UPDATE contracts SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...fields.map((f) => parsed.data[f])]
    );
    return ApiResponse.success(rows[0], "Contract updated");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const DELETE = withPermission(PERMISSIONS.CONTRACT_DELETE, async (_req, { params }) => {
  try {
    const { id } = await params;
    await query(`DELETE FROM contracts WHERE id = $1`, [id]);
    return ApiResponse.success(null, "Contract deleted");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
