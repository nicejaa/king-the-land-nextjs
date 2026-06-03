#!/usr/bin/env node
import "dotenv/config";
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS work_task_assignees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES work_tasks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(task_id, user_id)
    )
  `);
  console.log("✅ work_task_assignees table created (or already exists)");
} finally {
  client.release();
  await pool.end();
}
