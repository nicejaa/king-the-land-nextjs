import { z } from "zod";
import bcrypt from "bcryptjs";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const updateUserSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  role: z
    .enum(["SUPER_ADMIN","PROJECT_MANAGER","SITE_ENGINEER","CONTRACTOR","CRAFTSMAN","OWNER"])
    .optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export const GET = withPermission(PERMISSIONS.USER_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const { rows } = await query(
      `SELECT id, username, first_name, last_name, phone, role, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return ApiResponse.notFound("User not found");
    return ApiResponse.success(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch user", err);
  }
});

export const PATCH = withPermission(PERMISSIONS.USER_UPDATE, async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    }

    const updates = { ...parsed.data };
    if (updates.password) {
      updates.password_hash = await bcrypt.hash(updates.password, 12);
      delete updates.password;
    }

    const fields = Object.keys(updates);
    if (fields.length === 0) return ApiResponse.badRequest("No fields to update");

    const setClause = fields
      .map((f, i) => `${f} = $${i + 2}`)
      .join(", ");
    const values = [id, ...fields.map((f) => updates[f])];

    const { rows } = await query(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1
       RETURNING id, username, first_name, last_name, phone, role, is_active`,
      values
    );
    if (!rows[0]) return ApiResponse.notFound("User not found");
    return ApiResponse.success(rows[0], "User updated");
  } catch (err) {
    return ApiResponse.serverError("Failed to update user", err);
  }
});

export const DELETE = withPermission(PERMISSIONS.USER_DELETE, async (_req, { params }) => {
  try {
    const { id } = await params;
    const { rowCount } = await query("DELETE FROM users WHERE id = $1", [id]);
    if (!rowCount) return ApiResponse.notFound("User not found");
    return ApiResponse.success(null, "User deleted");
  } catch (err) {
    return ApiResponse.serverError("Failed to delete user", err);
  }
});
