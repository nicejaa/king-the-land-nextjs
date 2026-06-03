import { z } from "zod";
import { withPermission } from "lib/with-permission";
import { ApiResponse, paginationMeta } from "lib/api-response";
import { query } from "lib/db";
import { PERMISSIONS } from "constants/permissions";

const schema = z.object({
  company_name: z.string().min(1),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  username: z.string().optional(),
  address: z.string().optional(),
});

export const GET = withPermission(PERMISSIONS.CONTRACTOR_VIEW, async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const search = searchParams.get("search") ?? "";
    const offset = (page - 1) * limit;

    const where = search ? "WHERE company_name ILIKE $3 OR contact_name ILIKE $3" : "";
    const params = search ? [limit, offset, `%${search}%`] : [limit, offset];

    const [rows, countRes] = await Promise.all([
      query(`SELECT * FROM contractors ${where} ORDER BY company_name LIMIT $1 OFFSET $2`, params),
      query(`SELECT COUNT(*) FROM contractors ${search ? "WHERE company_name ILIKE $1 OR contact_name ILIKE $1" : ""}`, search ? [`%${search}%`] : []),
    ]);
    return ApiResponse.success(rows.rows, "Contractors fetched", paginationMeta(Number(countRes.rows[0].count), page, limit));
  } catch (err) {
    return ApiResponse.serverError("Failed to fetch contractors", err);
  }
});

export const POST = withPermission(PERMISSIONS.CONTRACTOR_CREATE, async (req) => {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiResponse.validationError(parsed.error.flatten().fieldErrors);
    const { company_name, contact_name, phone, username, address } = parsed.data;
    const { rows } = await query(
      `INSERT INTO contractors (company_name, contact_name, phone, username, address) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [company_name, contact_name, phone, username, address]
    );
    return ApiResponse.created(rows[0]);
  } catch (err) {
    return ApiResponse.serverError("Failed to create contractor", err);
  }
});
