import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const GET = withPermission(PERMISSIONS.DEFECT_VIEW, async (_req, { params }) => {
  try {
    const { id } = await params;
    const { rows } = await query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS uploader_name
       FROM attachments a
       LEFT JOIN users u ON u.id = a.uploaded_by
       WHERE a.module_name = 'DEFECT' AND a.record_id = $1
       ORDER BY a.created_at ASC`,
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
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return ApiResponse.validationError({ files: ["กรุณาเลือกไฟล์"] });
    }

    const uploadDir = join(process.cwd(), "public", "uploads", "defects");
    await mkdir(uploadDir, { recursive: true });

    const inserted = [];
    for (const file of files) {
      if (!file || typeof file === "string") continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await writeFile(join(uploadDir, filename), buffer);

      const fileUrl = `/uploads/defects/${filename}`;
      const fileType = file.type.startsWith("image/") ? "image" : "file";

      const { rows } = await query(
        `INSERT INTO attachments (module_name, record_id, file_url, file_type, uploaded_by)
         VALUES ('DEFECT', $1, $2, $3, $4) RETURNING *`,
        [id, fileUrl, fileType, session.user.id]
      );
      inserted.push(rows[0]);
    }

    return ApiResponse.created(inserted);
  } catch (err) {
    return ApiResponse.serverError("Failed to upload attachments", err);
  }
});
