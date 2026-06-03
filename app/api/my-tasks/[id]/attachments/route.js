import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const GET = withPermission(PERMISSIONS.MY_TASK_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const { rows } = await query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS uploader_name
       FROM work_task_attachments a
       JOIN users u ON u.id = a.user_id
       WHERE a.task_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );
    return ApiResponse.success(rows);
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch attachments", err);
  }
});

export const POST = withPermission(PERMISSIONS.UPLOAD_FILE, async (req, { params }, session) => {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") return ApiResponse.badRequest("No file provided");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "tasks");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, fileName), buffer);

    const fileUrl = `/uploads/tasks/${fileName}`;
    const fileType = file.type?.startsWith("image/") ? "image" : "file";

    const { rows } = await query(
      `INSERT INTO work_task_attachments (task_id, user_id, file_url, file_name, file_type)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, session.user.id, fileUrl, file.name, fileType]
    );
    return ApiResponse.created(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("Failed to upload attachment", err);
  }
});
