import { query } from "lib/db";

/**
 * Create a single notification for one user.
 * @param {{ userId: string, title: string, message: string, type?: string, link?: string }} opts
 */
export async function createNotification({ userId, title, message, type = "info", link = null }) {
  if (!userId) return;
  try {
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, title, message, type, link]
    );
  } catch (err) {
    console.error("[notify] failed to create notification:", err.message);
  }
}

/**
 * Create notifications for multiple users at once.
 * @param {string[]} userIds
 * @param {{ title: string, message: string, type?: string, link?: string }} payload
 */
export async function notifyMany(userIds, payload) {
  if (!userIds?.length) return;
  await Promise.all(userIds.map((userId) => createNotification({ userId, ...payload })));
}

/**
 * Fetch assignee user IDs for a work task.
 * @param {string} taskId
 * @returns {Promise<string[]>}
 */
export async function getTaskAssignees(taskId) {
  const { rows } = await query(
    `SELECT user_id FROM work_task_assignees WHERE task_id = $1`,
    [taskId]
  );
  return rows.map((r) => r.user_id);
}
