#!/usr/bin/env node
import "dotenv/config";
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS work_task_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES work_tasks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS work_task_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES work_tasks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      file_url TEXT NOT NULL,
      file_name TEXT,
      file_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_task_comments_task ON work_task_comments(task_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON work_task_attachments(task_id)`);
  console.log("✅ work_task_comments and work_task_attachments tables created");
} finally {
  client.release();
  await pool.end();
}
