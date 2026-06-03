import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

export const GET = withPermission(PERMISSIONS.NOTIFICATION_VIEW, async (req, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const offset = (page - 1) * limit;
    const unread_only = searchParams.get("unread") === "true";

    const where = unread_only
      ? "WHERE user_id = $3 AND is_read = false"
      : "WHERE user_id = $3";

    const [rows, countRes, unreadRes] = await Promise.all([
      query(
        `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset, session.user.id]
      ),
      query(
        `SELECT COUNT(*) FROM notifications ${where}`,
        [session.user.id]
      ),
      query(
        `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
        [session.user.id]
      ),
    ]);

    return ApiResponse.success(
      rows.rows,
      "Notifications fetched",
      {
        ...paginationMeta(Number(countRes.rows[0].count), page, limit),
        unreadCount: Number(unreadRes.rows[0].count),
      }
    );
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
