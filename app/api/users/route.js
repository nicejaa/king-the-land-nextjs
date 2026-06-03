import { z } from "zod";
import bcrypt from "bcryptjs";
import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query, withTransaction } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const ALLOWED_ROLES = [
  "SUPER_ADMIN","PROJECT_MANAGER","SITE_ENGINEER","CONTRACTOR","CRAFTSMAN","OWNER",
  "CONTRACTOR_OWNER","QA","FOREMAN",
];
const CONTRACTOR_CREATABLE_ROLES = ["QA", "FOREMAN", "CRAFTSMAN"];

const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(ALLOWED_ROLES),
  contractor_id: z.string().uuid().optional(),
});

export const GET = withPermission(PERMISSIONS.USER_VIEW, async (req, _ctx, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const search = searchParams.get("search") ?? "";
    const roleParam = searchParams.get("role") ?? "";
    const contractorIdParam = searchParams.get("contractor_id") ?? "";
    const offset = (page - 1) * limit;

    let where = [];
    let baseParams = [];
    let idx = 1;

    if (session.user.role === "CONTRACTOR_OWNER") {
      if (!session.user.contractor_id) {
        return ApiResponse.success([], "No contractor linked", paginationMeta(0, 1, limit));
      }
      const teamRoles = ["FOREMAN", "QA", "CRAFTSMAN"];
      where.push(`role::text = ANY($${idx++}::text[])`);
      baseParams.push(teamRoles);
      where.push(`contractor_id = $${idx++}`);
      baseParams.push(session.user.contractor_id);
    } else {
      if (roleParam) {
        const roles = roleParam.split(",").map((r) => r.trim()).filter(Boolean);
        if (roles.length === 1) {
          where.push(`role::text = $${idx++}`);
          baseParams.push(roles[0]);
        } else if (roles.length > 1) {
          where.push(`role::text = ANY($${idx++}::text[])`);
          baseParams.push(roles);
        }
      }
      if (contractorIdParam) {
        where.push(`contractor_id = $${idx++}`);
        baseParams.push(contractorIdParam);
      }
    }
    if (search) {
      where.push(`(username ILIKE $${idx} OR first_name ILIKE $${idx} OR last_name ILIKE $${idx})`);
      baseParams.push(`%${search}%`); idx++;
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [usersRes, countRes] = await Promise.all([
      query(
        `SELECT id, username, first_name, last_name, phone, role, contractor_id, is_active, created_at
         FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...baseParams, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM users ${whereClause}`, baseParams),
    ]);

    return ApiResponse.success(
      usersRes.rows,
      "Users fetched",
      paginationMeta(Number(countRes.rows[0].count), page, limit)
    );
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch users", err);
  }
});

export const POST = withPermission(PERMISSIONS.USER_CREATE, async (req, _ctx, session) => {
  try {
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    }

    let { username, password, first_name, last_name, phone, role, contractor_id } = parsed.data;

    if (session.user.role === "CONTRACTOR_OWNER") {
      if (!CONTRACTOR_CREATABLE_ROLES.includes(role)) {
        return ApiResponse.forbidden("Contractor owner can only create QA, Foreman or Craftsman users");
      }
      contractor_id = session.user.contractor_id;
    } else if (session.user.role === "PROJECT_MANAGER") {
      if (role !== "CONTRACTOR_OWNER") {
        return ApiResponse.forbidden("Project manager can only create Contractor Owner users");
      }
    }

    const existing = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (existing.rows.length > 0) {
      return ApiResponse.conflict("username already exists");
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO users (username, password_hash, first_name, last_name, phone, role, contractor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username, first_name, last_name, phone, role, contractor_id, is_active, created_at`,
        [username, password_hash, first_name, last_name, phone, role, contractor_id ?? null]
      );
      return rows[0];
    });

    return ApiResponse.created(result, "User created successfully");
  } catch (err) {
    return ApiResponse.serverError("Failed to create user", err);
  }
});
