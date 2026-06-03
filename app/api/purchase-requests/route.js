import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query, withTransaction } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const itemSchema = z.object({
  item_name: z.string().min(1),
  qty: z.number().positive(),
  unit: z.string().optional(),
  estimated_price: z.number().optional(),
});

const schema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

export const GET = withPermission(PERMISSIONS.PR_VIEW, async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const offset = (page - 1) * limit;

    const [rows, countRes] = await Promise.all([
      query(
        `SELECT pr.*, p.name AS project_name, u.first_name || ' ' || u.last_name AS requested_by_name
         FROM purchase_requests pr
         LEFT JOIN projects p ON p.id = pr.project_id
         LEFT JOIN users u ON u.id = pr.requested_by
         ORDER BY pr.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query(`SELECT COUNT(*) FROM purchase_requests`),
    ]);
    return ApiResponse.success(rows.rows, "PRs fetched", paginationMeta(Number(countRes.rows[0].count), page, limit));
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const POST = withPermission(PERMISSIONS.PR_CREATE, async (req, _ctx, session) => {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const { project_id, title, items } = parsed.data;

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO purchase_requests (project_id, requested_by, title, status) VALUES ($1,$2,$3,'PENDING') RETURNING *`,
        [project_id, session.user.id, title]
      );
      const pr = rows[0];
      for (const item of items) {
        await client.query(
          `INSERT INTO purchase_request_items (purchase_request_id, item_name, qty, unit, estimated_price) VALUES ($1,$2,$3,$4,$5)`,
          [pr.id, item.item_name, item.qty, item.unit, item.estimated_price]
        );
      }
      return pr;
    });
    return ApiResponse.created(result);
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
