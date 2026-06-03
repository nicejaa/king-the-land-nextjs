import { auth } from "auth";
import { ApiResponse } from "./api-response";

/**
 * Wrap a route handler with authentication check
 * @param {(req: Request, ctx: any, session: any) => Promise<Response>} handler
 * @returns {(req: Request, ctx: any) => Promise<Response>}
 */
export function withAuth(handler) {
  return async (req, ctx) => {
    try {
      const session = await auth();
      if (!session?.user) {
        return ApiResponse.unauthorized();
      }
      return handler(req, ctx, session);
    } catch (err) {
      console.error("[withAuth]", err);
      return ApiResponse.serverError("Authentication error", err);
    }
  };
}
