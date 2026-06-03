import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'info',
        ADD COLUMN IF NOT EXISTS link TEXT;
    `);
    console.log("✅ notifications: added type + link columns");
  } finally {
    client.release();
    await pool.end();
  }
}
migrate().catch(console.error);
