/**
 * Unified API response envelope.
 * HTTP status always matches `statusCode` in the body.
 *
 * Success: { success: true,  statusCode, message, data, errors: null }
 * Error:   { success: false, statusCode, message, data, errors }
 */

const buildPayload = ({
  success,
  statusCode,
  message,
  data = null,
  errors = null,
}) => ({
  success,
  statusCode,
  message,
  data,
  errors,
});

export const successResponse = (
  res,
  { message = "Success", data = null, statusCode = 200 } = {}
) => {
  return res.status(statusCode).json(
    buildPayload({
      success: true,
      statusCode,
      message,
      data,
      errors: null,
    })
  );
};

export const errorResponse = (
  res,
  {
    message = "Error",
    data = null,
    statusCode = 500,
    errors = null,
  } = {}
) => {
  return res.status(statusCode).json(
    buildPayload({
      success: false,
      statusCode,
      message,
      data,
      errors,
    })
  );
};

/**
 * Map Joi ValidationError.details → structured errors array.
 */
export const formatJoiErrors = (joiError) => {
  if (!joiError?.details?.length) return null;

  return joiError.details.map((detail) => ({
    field: detail.path?.length ? detail.path.join(".") : detail.context?.key || "unknown",
    message: detail.message.replace(/"/g, ""),
    type: detail.type,
  }));
};
