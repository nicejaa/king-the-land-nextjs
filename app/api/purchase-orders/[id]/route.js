import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

export const GET = withPermission(PERMISSIONS.PO_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const { rows } = await query(
      `SELECT po.*, p.name AS project_name FROM purchase_orders po
       LEFT JOIN projects p ON p.id = po.project_id WHERE po.id = $1`,
      [id]
    );
    if (!rows[0]) return ApiResponse.notFound();
    return ApiResponse.success(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const PATCH = withPermission(PERMISSIONS.PO_APPROVE, async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const schema = z.object({
      status: z.enum(["DRAFT","APPROVED","ORDERED","DELIVERED","PAID","CANCELLED"]).optional(),
      supplier_name: z.string().optional(),
      total_amount: z.number().optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const fields = Object.keys(parsed.data);
    if (!fields.length) return ApiResponse.badRequest();
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const { rows } = await query(
      `UPDATE purchase_orders SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...fields.map((f) => parsed.data[f])]
    );
    return ApiResponse.success(rows[0], "PO updated");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
