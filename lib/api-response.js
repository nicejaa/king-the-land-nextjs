import { NextResponse } from "next/server";

/**
 * Standard API response helpers
 */
export const ApiResponse = {
  /**
   * 200 OK
   * @param {any} data
   * @param {string} [message]
   * @param {Record<string, any>} [meta]
   */
  success(data, message = "Success", meta = {}) {
    return NextResponse.json(
      { success: true, message, data, ...meta },
      { status: 200 }
    );
  },

  /**
   * 201 Created
   * @param {any} data
   * @param {string} [message]
   */
  created(data, message = "Created successfully") {
    return NextResponse.json(
      { success: true, message, data },
      { status: 201 }
    );
  },

  /**
   * 400 Bad Request
   * @param {string} [message]
   * @param {any} [errors]
   */
  badRequest(message = "Bad request", errors = null) {
    return NextResponse.json(
      { success: false, message, errors },
      { status: 400 }
    );
  },

  /**
   * 401 Unauthorized
   * @param {string} [message]
   */
  unauthorized(message = "Unauthorized") {
    return NextResponse.json({ success: false, message }, { status: 401 });
  },

  /**
   * 403 Forbidden
   * @param {string} [message]
   */
  forbidden(message = "Forbidden - Insufficient permissions") {
    return NextResponse.json({ success: false, message }, { status: 403 });
  },

  /**
   * 404 Not Found
   * @param {string} [message]
   */
  notFound(message = "Resource not found") {
    return NextResponse.json({ success: false, message }, { status: 404 });
  },

  /**
   * 409 Conflict
   * @param {string} [message]
   */
  conflict(message = "Resource already exists") {
    return NextResponse.json({ success: false, message }, { status: 409 });
  },

  /**
   * 422 Unprocessable Entity (Validation)
   * @param {any} errors
   * @param {string} [message]
   */
  validationError(errors, message = "Validation failed") {
    return NextResponse.json(
      { success: false, message, errors },
      { status: 422 }
    );
  },

  /**
   * 500 Internal Server Error
   * @param {string} [message]
   * @param {any} [error]
   */
  serverError(message = "Internal server error", error = null) {
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        success: false,
        message,
        ...(isDev && error ? { error: error.message, stack: error.stack } : {}),
      },
      { status: 500 }
    );
  },
};

/**
 * Build pagination meta
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 */
export function paginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
