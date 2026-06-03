import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

export const GET = withPermission(PERMISSIONS.DEFECT_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const { rows } = await query(
      `SELECT c.*, u.first_name || ' ' || u.last_name AS author_name, u.role AS author_role
       FROM defect_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.defect_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );
    return ApiResponse.success(rows);
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch comments", err);
  }
});

export const POST = withPermission(PERMISSIONS.DEFECT_VIEW, async (req, { params }, session) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = z.object({ content: z.string().min(1) }).safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);

    const { rows } = await query(
      `INSERT INTO defect_comments (defect_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *, (SELECT first_name || ' ' || last_name FROM users WHERE id = $2) AS author_name,
                   (SELECT role FROM users WHERE id = $2) AS author_role`,
      [id, session.user.id, parsed.data.content]
    );
    return ApiResponse.created(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("Failed to post comment", err);
  }
});
