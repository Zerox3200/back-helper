import { errorResponse, formatJoiErrors } from "../helpers/response.helpers.js";

/**
 * Async controller wrapper — forwards failures into the unified error envelope.
 */
export const ErrorCatch = (controller) => {
  return (req, res, next) => {
    Promise.resolve(controller(req, res, next)).catch((error) => {
      if (res.headersSent) return next(error);

      const statusCode =
        error.statusCode ||
        error.cause ||
        error.status ||
        (error.name === "ValidationError" ? 400 : 500);

      const isJoi = error.isJoi || error.name === "ValidationError";
      const errors =
        error.errors ||
        (isJoi ? formatJoiErrors(error) : null);

      return errorResponse(res, {
        statusCode: typeof statusCode === "number" ? statusCode : 500,
        message: error.message || "Internal server error",
        data: error.data ?? null,
        errors,
      });
    });
  };
};
