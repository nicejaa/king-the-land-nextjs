import { withAuth } from "lib/with-auth";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";

export const GET = withAuth(async () => {
  try {
    const { rows } = await query(
      `SELECT id, module, action, module || '_' || action AS code, description
       FROM permissions ORDER BY module, action`
    );
    return ApiResponse.success(rows);
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch permissions", err);
  }
});
