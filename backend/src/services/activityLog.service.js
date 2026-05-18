import { getPool } from "../config/database.js";

export async function createActivityLog(
  { jobId = null, taskId = null, userId, action, description },
  connection = null
) {
  const executor = connection || getPool();

  await executor.query(
    `INSERT INTO activity_logs (job_id, task_id, user_id, action, description)
     VALUES (?, ?, ?, ?, ?)`,
    [jobId, taskId, userId, action, description]
  );
}

