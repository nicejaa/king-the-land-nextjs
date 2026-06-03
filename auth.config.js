/**
 * Edge-compatible auth config (no pg/bcrypt imports)
 * Used by middleware.js as a proxy
 */

const PUBLIC_ROUTES = ["/login"];
const PUBLIC_PREFIXES = ["/view"];

/** Route → permission map (inline to keep Edge-safe, no Lucide imports) */
const ROUTE_PERMISSIONS = {
  "/dashboard": "DASHBOARD_VIEW",
  "/projects": "PROJECT_VIEW",
  "/tasks": "TASK_VIEW",
  "/my-tasks": "MY_TASK_VIEW",
  "/daily-logs": "DAILY_LOG_VIEW",
  "/inspections": "INSPECTION_VIEW",
  "/defects": "DEFECT_VIEW",
  "/contractors": "CONTRACTOR_VIEW",
  "/contracts": "CONTRACT_VIEW",
  "/procurement/pr": "PR_VIEW",
  "/procurement/po": "PO_VIEW",
  "/procurement/gr": "GR_VIEW",
  "/users": "USER_VIEW",
  "/roles": "ROLE_VIEW",
  "/notifications": "NOTIFICATION_VIEW",
};

/** @type {import("next-auth").NextAuthConfig} */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const pathname = nextUrl.pathname;
      const session = auth;

      if (pathname.startsWith("/api")) {
        return true;
      }

      if (PUBLIC_ROUTES.includes(pathname)) {
        if (session?.user) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return true;
      }

      if (!session?.user) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(loginUrl);
      }

      if (pathname === "/") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      const { permissions = [], role } = session.user;
      if (role === "SUPER_ADMIN") return true;

      const matched = Object.entries(ROUTE_PERMISSIONS).find(
        ([route]) => pathname === route || pathname.startsWith(route + "/")
      );


// console.error("USER PERMISSIONS:", JSON.stringify(permissions));
// console.error("REQUIRED:", matched?.[1]);
// console.error("HAS PERMISSION:", permissions.includes(matched?.[1]));
      

      if (matched) {
        const [, required] = matched;
        if (!permissions.includes(required)) {
          return Response.redirect(new URL("/403", nextUrl));
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
        token.contractor_id = user.contractor_id ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.permissions = token.permissions ?? [];
        session.user.contractor_id = token.contractor_id ?? null;
      }
      return session;
    },
  },
};
