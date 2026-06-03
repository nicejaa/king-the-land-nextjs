import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query, withTransaction } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const GET = withPermission(PERMISSIONS.ROLE_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const [roleRes, permsRes] = await Promise.all([
      query(`SELECT * FROM roles WHERE id = $1`, [id]),
      query(
        `SELECT p.module || '_' || p.action AS code, p.module, p.action, p.description
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1`,
        [id]
      ),
    ]);
    if (!roleRes.rows[0]) return ApiResponse.notFound("Role not found");
    return ApiResponse.success({ ...roleRes.rows[0], permissions: permsRes.rows });
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch role", err);
  }
});

export const PATCH = withPermission(PERMISSIONS.ROLE_UPDATE, async (req, { params }) => { 
  try {
    
    const { id } = await params;
   
    
    const body = await req.json();
  
    
    const parsed = updateRoleSchema.safeParse(body);
    
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const { permissions, ...rest } = parsed.data;
  
    await withTransaction(async (client) => {
      if (Object.keys(rest).length > 0) {
        const fields = Object.keys(rest);
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
        
        await client.query(
          `UPDATE roles SET ${setClause} WHERE id = $1`,
          [id, ...fields.map((f) => rest[f])]
        );
      }
      console.log(permissions);
      
      if (permissions !== undefined) {
        console.log('oh bayby');
        
        await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);
        if (permissions.length > 0) {
          const permRows = await client.query(
            `SELECT id FROM permissions WHERE module || '_' || action = ANY($1)`,
            [permissions]
          );

          console.log(permRows.rows);
          
          
          for (const perm of permRows.rows) {
            
            await client.query(
              `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [id, perm.id]
            );
          }
        }
      }
    });

    const { rows } = await query(`SELECT * FROM roles WHERE id = $1`, [id]);
    return ApiResponse.success(rows[0], "Role updated");
  } catch (err) {
  console.log("💥 ERROR:", err?.message);   // message อ่านง่าย
  console.log("💥 STACK:", err?.stack);     // stack trace
  console.log("💥 RAW:", String(err));      // fallback
  return ApiResponse.serverError("Failed to update role", err);
}
});

export const DELETE = withPermission(PERMISSIONS.ROLE_DELETE, async (_req, { params }) => {
  try {
    const { id } = await params;
    await query(`DELETE FROM roles WHERE id = $1`, [id]);
    return ApiResponse.success(null, "Role deleted");
  } catch (err) {
    return ApiResponse.serverError("Failed to delete role", err);
  }
});



