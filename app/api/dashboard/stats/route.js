import { withAuth } from "lib/with-auth";
import { ApiResponse } from "lib/api-response";
import { query } from "lib/db";

export const GET = withAuth(async () => {
  try {
    const [
      projectsRes,
      tasksRes,
      defectsRes,
      prsRes,
      recentProjectsRes,
      recentDefectsRes,
      taskByStatusRes,
      defectByStatusRes,
    ] = await Promise.all([
      query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active
        FROM projects`),
      query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending
        FROM work_tasks`),
      query(`SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('CLOSED')) AS open,
        COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND status NOT IN ('CLOSED')) AS critical
        FROM defects`),
      query(`SELECT COUNT(*) FILTER (WHERE status = 'PENDING') AS pending FROM purchase_requests`),
      query(`SELECT id, name, budget, status FROM projects ORDER BY created_at DESC LIMIT 5`),
      query(`SELECT id, title, severity, status FROM defects ORDER BY created_at DESC LIMIT 5`),
      query(`SELECT status, COUNT(*) AS count FROM work_tasks GROUP BY status`),
      query(`SELECT status, COUNT(*) AS count FROM defects GROUP BY status`),
    ]);

    const taskByStatus = {};
    taskByStatusRes.rows.forEach((r) => { taskByStatus[r.status] = r.count; });

    const defectByStatus = {};
    defectByStatusRes.rows.forEach((r) => { defectByStatus[r.status] = r.count; });

    return ApiResponse.success({
      totalProjects: Number(projectsRes.rows[0]?.total ?? 0),
      activeProjects: Number(projectsRes.rows[0]?.active ?? 0),
      totalTasks: Number(tasksRes.rows[0]?.total ?? 0),
      pendingTasks: Number(tasksRes.rows[0]?.pending ?? 0),
      openDefects: Number(defectsRes.rows[0]?.open ?? 0),
      criticalDefects: Number(defectsRes.rows[0]?.critical ?? 0),
      pendingPRs: Number(prsRes.rows[0]?.pending ?? 0),
      recentProjects: recentProjectsRes.rows,
      recentDefects: recentDefectsRes.rows,
      taskByStatus,
      defectByStatus,
    });
  } catch (err) {
    return ApiResponse.serverError("Failed to load dashboard stats", err);
  }
});
