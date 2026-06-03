/**
 * Application-level error classes
 */

export class AppError extends Error {
  /** @param {string} message @param {number} statusCode */
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  /** @param {any} errors @param {string} message */
  constructor(errors, message = "Validation failed") {
    super(message, 422);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

/**
 * Handle known AppErrors and return appropriate response data
 * @param {unknown} error
 * @returns {{ message: string; statusCode: number; errors?: any }}
 */
export function handleError(error) {
  if (error instanceof ValidationError) {
    return { message: error.message, statusCode: 422, errors: error.errors };
  }
  if (error instanceof AppError) {
    return { message: error.message, statusCode: error.statusCode };
  }
  if (error instanceof Error) {
    console.error("[Unhandled Error]", error);
    return { message: "Internal server error", statusCode: 500 };
  }
  return { message: "Unknown error", statusCode: 500 };
}
