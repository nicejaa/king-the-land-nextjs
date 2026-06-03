import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query, withTransaction } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const createRoleSchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const GET = withPermission(PERMISSIONS.ROLE_VIEW, async () => {
  try {
    const { rows } = await query(
      `SELECT r.id, r.code, r.name, r.description, r.created_at,
              COUNT(rp.permission_id) AS permission_count
       FROM roles r
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       GROUP BY r.id ORDER BY r.created_at`
    );
    return ApiResponse.success(rows);
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch roles", err);
  }
});

export const POST = withPermission(PERMISSIONS.ROLE_CREATE, async (req) => {
  try {
    const body = await req.json();
    const parsed = createRoleSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    }
    const { code, name, description, permissions = [] } = parsed.data;

    const existing = await query("SELECT id FROM roles WHERE code = $1", [code]);
    if (existing.rows.length > 0) return ApiResponse.conflict("Role code already exists");

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO roles (code, name, description) VALUES ($1, $2, $3) RETURNING *`,
        [code, name, description]
      );
      const role = rows[0];
      if (permissions.length > 0) {
        const permRows = await client.query(
          `SELECT id FROM permissions WHERE module || '_' || action = ANY($1)`,
          [permissions]
        );
        for (const perm of permRows.rows) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [role.id, perm.id]
          );
        }
      }
      return role;
    });
    return ApiResponse.created(result, "Role created");
  } catch (err) {
    return ApiResponse.serverError("Failed to create role", err);
  }
});
