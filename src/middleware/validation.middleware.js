import { ErrorCatch } from "../utils/ErrorCatch.js";
import { errorResponse, formatJoiErrors } from "../helpers/response.helpers.js";

const validate = (schema, source, assign) =>
  ErrorCatch(async (req, res, next) => {
    const { error, value } = schema.validate(source(req), {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = formatJoiErrors(error);
      return errorResponse(res, {
        statusCode: 400,
        message: errors.map((e) => e.message).join(", ") || "Validation failed",
        errors,
      });
    }

    assign(req, value);
    return next();
  });

/** Validate & replace req.body */
export const isvalid = (schema) =>
  validate(schema, (req) => req.body, (req, v) => {
    req.body = v;
  });

/** Validate & replace req.query */
export const isvalidQuery = (schema) =>
  validate(schema, (req) => req.query, (req, v) => {
    req.query = v;
  });

/** Validate & replace req.params */
export const isvalidParams = (schema) =>
  validate(schema, (req) => req.params, (req, v) => {
    req.params = v;
  });

/**
 * Validate body + params + query in one schema (merged source).
 * Useful for simple schemas that mix sources.
 */
export const isvalidAll = (schema) =>
  validate(
    schema,
    (req) => ({ ...req.body, ...req.params, ...req.query }),
    (req, v) => {
      req.validated = v;
    }
  );
