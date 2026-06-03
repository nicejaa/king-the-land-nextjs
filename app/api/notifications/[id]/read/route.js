import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

export const PATCH = withPermission(PERMISSIONS.NOTIFICATION_VIEW, async (_req, { params }, session) => {
  try {
    const { id } = await params;
    await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, session.user.id]
    );
    return ApiResponse.success(null, "Marked as read");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
