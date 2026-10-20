import { errorResponse } from "./response.helpers.js";

/**
 * Throw from services: `throw httpError("Not found", 404)`
 */
export const httpError = (message, statusCode = 500, errors = null) =>
  Object.assign(new Error(message), { statusCode, errors, isOperational: true });

/**
 * Convert a service error into the unified error envelope.
 */
export const handleServiceError = (res, error) =>
  errorResponse(res, {
    statusCode: error.statusCode || error.cause || 500,
    message: error.message || "Internal server error",
    data: error.data ?? null,
    errors: error.errors ?? null,
  });
