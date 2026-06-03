import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

export const GET = withPermission(PERMISSIONS.PR_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const [prRes, itemsRes] = await Promise.all([
      query(`SELECT pr.*, p.name AS project_name FROM purchase_requests pr LEFT JOIN projects p ON p.id = pr.project_id WHERE pr.id = $1`, [id]),
      query(`SELECT * FROM purchase_request_items WHERE purchase_request_id = $1`, [id]),
    ]);
    if (!prRes.rows[0]) return ApiResponse.notFound();
    return ApiResponse.success({ ...prRes.rows[0], items: itemsRes.rows });
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const PATCH = withPermission(PERMISSIONS.PR_APPROVE, async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const schema = z.object({ status: z.enum(["PENDING","APPROVED","REJECTED"]) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const { rows } = await query(
      `UPDATE purchase_requests SET status = $2 WHERE id = $1 RETURNING *`,
      [id, parsed.data.status]
    );
    return ApiResponse.success(rows[0], "PR updated");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
