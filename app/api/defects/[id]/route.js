import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query, withTransaction } from "lib/db";
import { PERMISSIONS } from "constants/permissions";
import { createNotification } from "lib/notify";

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  severity: z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]).optional(),
  status: z.enum(["OPEN","ASSIGNED","FIXING","VERIFYING","CLOSED","REJECTED"]).optional(),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().optional(),
});

const verifySchema = z.object({
  action: z.enum(["ACCEPT","REJECT"]),
  note: z.string().optional(),
});

export const GET = withPermission(PERMISSIONS.DEFECT_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const [defectRes, verificationsRes] = await Promise.all([
      query(
        `SELECT d.*, u.first_name || ' ' || u.last_name AS assigned_to_name, p.name AS project_name
         FROM defects d LEFT JOIN users u ON u.id = d.assigned_to LEFT JOIN projects p ON p.id = d.project_id
         WHERE d.id = $1`,
        [id]
      ),
      query(
        `SELECT dv.*, u.first_name || ' ' || u.last_name AS verified_by_name
         FROM defect_verifications dv LEFT JOIN users u ON u.id = dv.verified_by
         WHERE dv.defect_id = $1 ORDER BY dv.created_at DESC`,
        [id]
      ),
    ]);
    if (!defectRes.rows[0]) return ApiResponse.notFound();
    return ApiResponse.success({ ...defectRes.rows[0], verifications: verificationsRes.rows });
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const PATCH = withPermission(PERMISSIONS.DEFECT_UPDATE, async (req, { params }, session) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, note, ...rest } = body;

    if (action !== undefined) {
      const parsed = verifySchema.safeParse({ action, note });
      if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);

      const isAccept = parsed.data.action === "ACCEPT";
      const newStatus = isAccept ? "CLOSED" : "REJECTED";
      const autoComment = isAccept
        ? "✅ QA ยืนยันผ่านแล้ว — ปิดเคส"
        : `❌ QA ไม่ผ่าน — ต้องแก้ใหม่${parsed.data.note ? ": " + parsed.data.note : ""}`;

      const defectRes = await query(`SELECT assigned_to, title, work_task_id FROM defects WHERE id = $1`, [id]);
      const defect = defectRes.rows[0];
      await withTransaction(async (client) => {
        await client.query(
          `UPDATE defects SET status = $2, verified_at = $3 WHERE id = $1`,
          [id, newStatus, isAccept ? new Date() : null]
        );
        await client.query(
          `INSERT INTO defect_verifications (defect_id, verified_by, action, note) VALUES ($1, $2, $3, $4)`,
          [id, session.user.id, parsed.data.action, parsed.data.note]
        );
        await client.query(
          `INSERT INTO defect_comments (defect_id, user_id, content) VALUES ($1, $2, $3)`,
          [id, session.user.id, autoComment]
        );
      });
      if (defect?.assigned_to && defect.assigned_to !== session.user.id) {
        await createNotification({
          userId: defect.assigned_to,
          title: isAccept ? "ข้อบกพร่องผ่านแล้ว" : "ข้อบกพร่องไม่ผ่าน — ต้องแก้ใหม่",
          message: `"${defect.title}" ${isAccept ? "QA ยืนยันผ่านแล้ว" : `QA ไม่ผ่าน${parsed.data.note ? ": " + parsed.data.note : ""}`}`,
          type: "defect",
          link: defect.work_task_id ? `/my-tasks/${defect.work_task_id}` : `/defects`,
        });
      }
      return ApiResponse.success({ status: newStatus }, `Defect ${parsed.data.action.toLowerCase()}ed`);
    }

    const parsed = updateSchema.safeParse(rest);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const fields = Object.keys(parsed.data);
    if (!fields.length) return ApiResponse.badRequest("ไม่มีข้อมูลที่จะอัพเดท");
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const { rows } = await query(
      `UPDATE defects SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...fields.map((f) => parsed.data[f])]
    );
    return ApiResponse.success(rows[0], "Defect updated");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});

export const DELETE = withPermission(PERMISSIONS.DEFECT_DELETE, async (_req, { params }) => {
  try {
    const { id } = await params;
    await query(`DELETE FROM defects WHERE id = $1`, [id]);
    return ApiResponse.success(null, "Defect deleted");
  } catch (err) {
    return ApiResponse.serverError("", err);
  }
});
