#!/usr/bin/env node
/**
 * Seed script: permissions, roles, role_permissions, super admin
 * Run: pnpm seed
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ALL_PERMISSIONS = [
  { module: "DASHBOARD", action: "VIEW", description: "View dashboard" },
  { module: "USER", action: "VIEW", description: "View users" },
  { module: "USER", action: "CREATE", description: "Create users" },
  { module: "USER", action: "UPDATE", description: "Update users" },
  { module: "USER", action: "DELETE", description: "Delete users" },
  { module: "ROLE", action: "VIEW", description: "View roles" },
  { module: "ROLE", action: "CREATE", description: "Create roles" },
  { module: "ROLE", action: "UPDATE", description: "Update roles" },
  { module: "ROLE", action: "DELETE", description: "Delete roles" },
  { module: "PROJECT", action: "VIEW", description: "View projects" },
  { module: "PROJECT", action: "CREATE", description: "Create projects" },
  { module: "PROJECT", action: "UPDATE", description: "Update projects" },
  { module: "PROJECT", action: "DELETE", description: "Delete projects" },
  { module: "LOCATION", action: "VIEW", description: "View locations" },
  { module: "LOCATION", action: "CREATE", description: "Create locations" },
  { module: "LOCATION", action: "UPDATE", description: "Update locations" },
  { module: "LOCATION", action: "DELETE", description: "Delete locations" },
  { module: "CONTRACTOR", action: "VIEW", description: "View contractors" },
  { module: "CONTRACTOR", action: "CREATE", description: "Create contractors" },
  { module: "CONTRACTOR", action: "UPDATE", description: "Update contractors" },
  { module: "CONTRACTOR", action: "DELETE", description: "Delete contractors" },
  { module: "CONTRACT", action: "VIEW", description: "View contracts" },
  { module: "CONTRACT", action: "CREATE", description: "Create contracts" },
  { module: "CONTRACT", action: "UPDATE", description: "Update contracts" },
  { module: "CONTRACT", action: "DELETE", description: "Delete contracts" },
  { module: "TASK", action: "VIEW", description: "View tasks" },
  { module: "TASK", action: "CREATE", description: "Create tasks" },
  { module: "TASK", action: "UPDATE", description: "Update tasks" },
  { module: "TASK", action: "DELETE", description: "Delete tasks" },
  { module: "TASK", action: "ASSIGN", description: "Assign tasks" },
  { module: "DAILY_LOG", action: "VIEW", description: "View daily logs" },
  { module: "DAILY_LOG", action: "CREATE", description: "Create daily logs" },
  { module: "DAILY_LOG", action: "UPDATE", description: "Update daily logs" },
  { module: "DAILY_LOG", action: "DELETE", description: "Delete daily logs" },
  { module: "INSPECTION", action: "VIEW", description: "View inspections" },
  { module: "INSPECTION", action: "CREATE", description: "Create inspections" },
  { module: "INSPECTION", action: "VERIFY", description: "Verify inspections" },
  { module: "DEFECT", action: "VIEW", description: "View defects" },
  { module: "DEFECT", action: "CREATE", description: "Create defects" },
  { module: "DEFECT", action: "UPDATE", description: "Update defects" },
  { module: "DEFECT", action: "DELETE", description: "Delete defects" },
  { module: "DEFECT", action: "VERIFY", description: "Verify defects" },
  { module: "PR", action: "VIEW", description: "View purchase requests" },
  { module: "PR", action: "CREATE", description: "Create purchase requests" },
  { module: "PR", action: "APPROVE", description: "Approve purchase requests" },
  { module: "PO", action: "VIEW", description: "View purchase orders" },
  { module: "PO", action: "CREATE", description: "Create purchase orders" },
  { module: "PO", action: "APPROVE", description: "Approve purchase orders" },
  { module: "GR", action: "VIEW", description: "View goods receipts" },
  { module: "GR", action: "CREATE", description: "Create goods receipts" },
  { module: "UPLOAD", action: "FILE", description: "Upload files" },
  { module: "DELETE", action: "FILE", description: "Delete files" },
  { module: "NOTIFICATION", action: "VIEW", description: "View notifications" },
];

const ROLES = [
  {
    code: "SUPER_ADMIN",
    name: "Super Administrator",
    description: "Full access to all system features",
    permissions: ALL_PERMISSIONS.map((p) => `${p.module}_${p.action}`),
  },
  {
    code: "PROJECT_MANAGER",
    name: "Project Manager",
    description: "Manages projects and teams",
    permissions: [
      "DASHBOARD_VIEW", "PROJECT_VIEW",
      "LOCATION_VIEW",
      "CONTRACTOR_VIEW", "CONTRACTOR_CREATE", "CONTRACTOR_UPDATE",
      "CONTRACT_VIEW",
      "TASK_VIEW", "TASK_CREATE", "TASK_UPDATE", "TASK_ASSIGN",
      "DAILY_LOG_VIEW", "DAILY_LOG_CREATE",
      "INSPECTION_VIEW", "DEFECT_VIEW", "DEFECT_UPDATE",
      "PR_VIEW", "PO_VIEW", "GR_VIEW",
      "USER_VIEW", "USER_CREATE",
      "NOTIFICATION_VIEW", "UPLOAD_FILE",
    ],
  },
  {
    code: "SITE_ENGINEER",
    name: "Site Engineer",
    description: "On-site engineer with field operations access",
    permissions: [
      "DASHBOARD_VIEW", "PROJECT_VIEW", "LOCATION_VIEW",
      "TASK_VIEW", "TASK_UPDATE",
      "DAILY_LOG_VIEW", "DAILY_LOG_CREATE", "DAILY_LOG_UPDATE",
      "INSPECTION_VIEW", "INSPECTION_CREATE", "INSPECTION_VERIFY",
      "DEFECT_VIEW", "DEFECT_CREATE", "DEFECT_UPDATE", "DEFECT_VERIFY",
      "PR_VIEW", "PR_CREATE", "PO_VIEW", "GR_VIEW", "GR_CREATE",
      "NOTIFICATION_VIEW", "UPLOAD_FILE",
    ],
  },
  {
    code: "CONTRACTOR",
    name: "Contractor",
    description: "External contractor with limited access",
    permissions: ["DASHBOARD_VIEW", "TASK_VIEW", "TASK_UPDATE", "DEFECT_VIEW", "NOTIFICATION_VIEW", "UPLOAD_FILE"],
  },
  {
    code: "CRAFTSMAN",
    name: "Craftsman",
    description: "Skilled worker with minimal access",
    permissions: ["MY_TASK_VIEW", "TASK_VIEW", "TASK_UPDATE", "DEFECT_VIEW", "NOTIFICATION_VIEW", "UPLOAD_FILE"],
  },
  {
    code: "OWNER",
    name: "Owner",
    description: "Project owner with read-only access",
    permissions: [
      "DASHBOARD_VIEW", "PROJECT_VIEW", "TASK_VIEW", "DEFECT_VIEW",
      "DAILY_LOG_VIEW", "INSPECTION_VIEW", "PR_VIEW", "PO_VIEW", "GR_VIEW", "NOTIFICATION_VIEW",
    ],
  },
  {
    code: "CONTRACTOR_OWNER",
    name: "เจ้าของผู้รับเหมา (Contractor Owner)",
    description: "เจ้าของผู้รับเหมา — จัดการทีมและงานที่ได้รับมอบหมาย",
    permissions: [
      "DASHBOARD_VIEW",
      "PROJECT_VIEW",
      "TASK_VIEW", "TASK_UPDATE", "TASK_ASSIGN",
      "DAILY_LOG_VIEW", "DAILY_LOG_CREATE",
      "DEFECT_VIEW", "DEFECT_CREATE", "DEFECT_UPDATE",
      "USER_VIEW", "USER_CREATE",
      "NOTIFICATION_VIEW", "UPLOAD_FILE",
    ],
  },
  {
    code: "QA",
    name: "QA Inspector",
    description: "ผู้ตรวจสอบคุณภาพ — บันทึกงานประจำวันและรายงานข้อบกพร่อง",
    permissions: [
      "DASHBOARD_VIEW", "MY_TASK_VIEW", "TASK_VIEW", "TASK_UPDATE",
      "DAILY_LOG_VIEW", "DAILY_LOG_CREATE",
      "DEFECT_VIEW", "DEFECT_CREATE", "DEFECT_UPDATE",
      "NOTIFICATION_VIEW", "UPLOAD_FILE",
    ],
  },
  {
    code: "FOREMAN",
    name: "Foreman",
    description: "ช่างหัวหน้า — บันทึกงานประจำวัน",
    permissions: [
      "DASHBOARD_VIEW", "MY_TASK_VIEW", "TASK_VIEW", "TASK_UPDATE",
      "DAILY_LOG_VIEW", "DAILY_LOG_CREATE",
      "DEFECT_VIEW", "DEFECT_CREATE", "DEFECT_UPDATE",
      "NOTIFICATION_VIEW", "UPLOAD_FILE",
    ],
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log("🌱 Starting seed...\n");
    await client.query("BEGIN");

    console.log("📋 Seeding permissions...");
    const permissionIds = {};
    for (const perm of ALL_PERMISSIONS) {
      const code = `${perm.module}_${perm.action}`;
      const { rows } = await client.query(
        `INSERT INTO permissions (module, action, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (module, action) DO UPDATE SET description = EXCLUDED.description
         RETURNING id`,
        [perm.module, perm.action, perm.description]
      );
      permissionIds[code] = rows[0].id;
    }
    console.log(`   ✅ ${ALL_PERMISSIONS.length} permissions seeded`);

    console.log("🎭 Seeding roles...");
    for (const role of ROLES) {
      const { rows } = await client.query(
        `INSERT INTO roles (code, name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
         RETURNING id`,
        [role.code, role.name, role.description]
      );
      const roleId = rows[0].id;

      await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);

      for (const permCode of role.permissions) {
        const permId = permissionIds[permCode];
        if (permId) {
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [roleId, permId]
          );
        }
      }
      console.log(`   ✅ Role: ${role.code} (${role.permissions.length} permissions)`);
    }

    console.log("👤 Seeding super admin...");
    const username = "admin@example.com";
    const password = "Admin123!";
    const password_hash = await bcrypt.hash(password, 12);

    const { rows: existing } = await client.query(
      `SELECT id FROM users WHERE username = $1`, [username]
    );

    if (existing.length > 0) {
      await client.query(
        `UPDATE users SET password_hash = $2, role = 'SUPER_ADMIN', is_active = true WHERE username = $1`,
        [username, password_hash]
      );
      console.log(`   ℹ️  Admin user updated`);
    } else {
      await client.query(
        `INSERT INTO users (username, password_hash, first_name, last_name, role, is_active)
         VALUES ($1, $2, 'Super', 'Admin', 'SUPER_ADMIN', true)`,
        [username, password_hash]
      );
      console.log(`   ✅ Admin user created`);
    }

    await client.query("COMMIT");

    console.log("\n✅ Seed completed successfully!");
    console.log("─────────────────────────────");
    console.log(`   username:    ${username}`);
    console.log(`   Password: ${password}`);
    console.log("─────────────────────────────\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
