import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS defect_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        defect_id UUID REFERENCES defects(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_defect_comments_defect ON defect_comments(defect_id);
    `);
    console.log("✅ defect_comments table created");
  } finally {
    client.release();
    await pool.end();
  }
}
migrate().catch(console.error);
