import { auth } from "auth";
import { ApiResponse } from "./api-response";
import { hasPermission, isSuperAdmin } from "./permissions";

/**
 * Wrap a route handler with permission check
 * @param {string | string[]} requiredPermission - Permission code(s) required
 * @param {(req: Request, ctx: any, session: any) => Promise<Response>} handler
 * @returns {(req: Request, ctx: any) => Promise<Response>}
 */
export function withPermission(requiredPermission, handler) {
  
  return async (req, ctx) => {
    try {
      
      const session = await auth();

      if (!session?.user) {
        return ApiResponse.unauthorized();
      }

      const { user } = session;

      if (isSuperAdmin(user)) {
        return handler(req, ctx, session);
      }

      const permissions = user.permissions ?? [];
      const required = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];

      const hasAccess = required.some((p) => hasPermission(permissions, p));

      
      if (!hasAccess) {
        return ApiResponse.forbidden();
      }
      

      

      return handler(req, ctx, session);
    } catch (err) {
      console.error("[withPermission]", err);
      return ApiResponse.serverError("Authorization error", err);
    }
  };
}
