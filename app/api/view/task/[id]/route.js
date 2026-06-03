import { query } from "lib/db";
import { ApiResponse } from "lib/api-response";

export async function GET(_req, { params }) {
  try {
    const { id } = await params;

    const [taskRes, commentsRes, attachmentsRes, defectsRes] = await Promise.all([
      query(
        `SELECT t.id, t.title, t.description, t.status, t.progress_percent, t.planned_end,
                t.planned_start, t.created_at,
                p.name AS project_name,
                STRING_AGG(DISTINCT u.first_name || ' ' || u.last_name, ', ') AS assignee_names
         FROM work_tasks t
         LEFT JOIN projects p ON p.id = t.project_id
         LEFT JOIN work_task_assignees wa ON wa.task_id = t.id
         LEFT JOIN users u ON u.id = wa.user_id
         WHERE t.id = $1 AND t.deleted_at IS NULL
         GROUP BY t.id, p.name`,
        [id]
      ),
      query(
        `SELECT c.content, c.created_at,
                u.first_name || ' ' || u.last_name AS author_name, u.role AS author_role
         FROM work_task_comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.task_id = $1
         ORDER BY c.created_at ASC`,
        [id]
      ),
      query(
        `SELECT a.file_url, a.file_name, a.created_at,
                u.first_name || ' ' || u.last_name AS uploader_name
         FROM work_task_attachments a
         JOIN users u ON u.id = a.user_id
         WHERE a.task_id = $1
         ORDER BY a.created_at ASC`,
        [id]
      ),
      query(
        `SELECT d.id, d.title, d.severity, d.status, d.description, d.created_at,
                COALESCE((
                  SELECT json_agg(json_build_object(
                    'id', dc.id, 'content', dc.content, 'created_at', dc.created_at,
                    'author_name', u.first_name || ' ' || u.last_name, 'author_role', u.role
                  ) ORDER BY dc.created_at ASC)
                  FROM defect_comments dc
                  JOIN users u ON u.id = dc.user_id
                  WHERE dc.defect_id = d.id
                ), '[]') AS comments,
                COALESCE((
                  SELECT json_agg(json_build_object(
                    'id', a.id, 'file_url', a.file_url, 'created_at', a.created_at,
                    'uploader_name', u2.first_name || ' ' || u2.last_name
                  ) ORDER BY a.created_at ASC)
                  FROM attachments a
                  LEFT JOIN users u2 ON u2.id = a.uploaded_by
                  WHERE a.module_name = 'DEFECT' AND a.record_id = d.id
                ), '[]') AS photos
         FROM defects d
         WHERE d.work_task_id = $1
         ORDER BY d.created_at ASC`,
        [id]
      ),
    ]);

    if (!taskRes.rows[0]) return ApiResponse.notFound("ไม่พบข้อมูลงาน");

    return ApiResponse.success({
      task: taskRes.rows[0],
      comments: commentsRes.rows,
      attachments: attachmentsRes.rows,
      defects: defectsRes.rows,
    });
  } catch (err) {
    return ApiResponse.serverError("ไม่สามารถโหลดข้อมูลได้", err);
  }
}
