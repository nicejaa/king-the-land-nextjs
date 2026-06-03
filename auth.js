import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
        token.contractor_id = user.contractor_id ?? null;
      } else if (token.id) {
        token.permissions = await loadUserPermissions(token.id, token.role);
      }
      return token;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "username", type: "username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const { rows: users } = await pool.query(
            `SELECT id, username, password_hash, first_name, last_name, role, is_active, contractor_id
             FROM users WHERE username = $1`,
            [credentials.username]
          );

          const user = users[0];
          if (!user || !user.is_active) return null;

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );
          if (!isValid) return null;

          const permissions = await loadUserPermissions(user.id, user.role);

          return {
            id: user.id,
            username: user.username,
            name: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim(),
            role: user.role,
            contractor_id: user.contractor_id ?? null,
            permissions,
          };
        } catch (err) {
          console.error("[NextAuth] authorize error:", err);
          return null;
        }
      },
    }),
  ],
});

/**
 * Load all permissions for a user (role permissions + direct user permissions)
 * @param {string} userId
 * @param {string} roleCode
 * @returns {Promise<string[]>}
 */
async function loadUserPermissions(userId, roleCode) {
  try {
    const { rows: rolePerms } = await pool.query(
      `SELECT DISTINCT p.module || '_' || p.action AS code
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       JOIN roles r ON r.id = rp.role_id
       WHERE r.code = $1`,
      [roleCode]
    );

    return rolePerms.map((r) => r.code);
  } catch (err) {
    console.error("[loadUserPermissions] error:", err?.message ?? err);
    return [];
  }
}
