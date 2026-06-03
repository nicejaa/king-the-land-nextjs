import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

export const PATCH = withPermission(PERMISSIONS.NOTIFICATION_VIEW, async (_req, _ctx, session) => {
  try {
    await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [session.user.id]
    );
    return ApiResponse.success(null, "All notifications marked as read");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
