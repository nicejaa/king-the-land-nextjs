import { withPermission } from "lib/with-permission";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const POST = withPermission(PERMISSIONS.UPLOAD_FILE, async (req, _ctx, session) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const entity_type = formData.get("entity_type") ?? "general";
    const entity_id = formData.get("entity_id");

    if (!file || typeof file === "string") {
      return ApiResponse.badRequest("No file provided");
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return ApiResponse.badRequest("File type not allowed");
    }

    if (file.size > MAX_FILE_SIZE) {
      return ApiResponse.badRequest("File size exceeds 20MB limit");
    }

    const uploadDir = process.env.UPLOAD_DIR ?? "./public/uploads";
    const dateDir = path.join(uploadDir, new Date().toISOString().slice(0, 7));
    await mkdir(dateDir, { recursive: true });

    const ext = path.extname(file.name);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(dateDir, uniqueName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const publicUrl = filePath.replace(/^\.\/public/, "");

    const { rows } = await query(
      `INSERT INTO attachments (entity_type, entity_id, file_name, file_url, file_size, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [entity_type, entity_id, file.name, publicUrl, file.size, file.type, session.user.id]
    );

    return ApiResponse.created(rows[0], "File uploaded successfully");
  } catch (err) {
    return ApiResponse.serverError("Upload failed", err);
  }
});
