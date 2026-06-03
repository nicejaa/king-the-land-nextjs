#!/usr/bin/env node
import "dotenv/config";
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("ALTER TABLE contractors ADD COLUMN IF NOT EXISTS username VARCHAR(255)");
  console.log("✅ contractors.username column added (or already exists)");
} finally {
  client.release();
  await pool.end();
}
