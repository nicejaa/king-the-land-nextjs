import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const schema = z.object({
  purchase_order_id: z.string().uuid(),
  received_date: z.string(),
  note: z.string().optional(),
});

export const GET = withPermission(PERMISSIONS.GR_VIEW, async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const offset = (page - 1) * limit;

    const [rows, countRes] = await Promise.all([
      query(
        `SELECT gr.*, po.po_no, po.supplier_name, u.first_name || ' ' || u.last_name AS received_by_name
         FROM goods_receipts gr
         LEFT JOIN purchase_orders po ON po.id = gr.purchase_order_id
         LEFT JOIN users u ON u.id = gr.received_by
         ORDER BY gr.received_date DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query(`SELECT COUNT(*) FROM goods_receipts`),
    ]);
    return ApiResponse.success(rows.rows, "GRs fetched", paginationMeta(Number(countRes.rows[0].count), page, limit));
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const POST = withPermission(PERMISSIONS.GR_CREATE, async (req, _ctx, session) => {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const { purchase_order_id, received_date, note } = parsed.data;
    const { rows } = await query(
      `INSERT INTO goods_receipts (purchase_order_id, received_by, received_date, note) VALUES ($1,$2,$3,$4) RETURNING *`,
      [purchase_order_id, session.user.id, received_date, note]
    );
    return ApiResponse.created(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
