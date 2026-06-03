import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const schema = z.object({
  project_id: z.string().uuid(),
  supplier_name: z.string().min(1),
  po_no: z.string().optional(),
  total_amount: z.number().optional(),
  status: z.enum(["DRAFT","APPROVED","ORDERED","DELIVERED","PAID","CANCELLED"]).optional(),
});

export const GET = withPermission(PERMISSIONS.PO_VIEW, async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const offset = (page - 1) * limit;

    const [rows, countRes] = await Promise.all([
      query(
        `SELECT po.*, p.name AS project_name FROM purchase_orders po
         LEFT JOIN projects p ON p.id = po.project_id
         ORDER BY po.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query(`SELECT COUNT(*) FROM purchase_orders`),
    ]);
    return ApiResponse.success(rows.rows, "POs fetched", paginationMeta(Number(countRes.rows[0].count), page, limit));
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const POST = withPermission(PERMISSIONS.PO_CREATE, async (req) => {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const d = parsed.data;
    const { rows } = await query(
      `INSERT INTO purchase_orders (project_id, supplier_name, po_no, total_amount, status) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [d.project_id, d.supplier_name, d.po_no, d.total_amount, d.status ?? "DRAFT"]
    );
    return ApiResponse.created(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
