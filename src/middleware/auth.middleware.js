import JWT from "jsonwebtoken";
import { ErrorCatch } from "../utils/ErrorCatch.js";
import { errorResponse } from "../helpers/response.helpers.js";
import { httpError } from "../helpers/httpError.js";

/**
 * Require a valid Bearer / header token.
 * Attaches decoded payload to `req.auth` and optional `req.user` when a loader is set.
 *
 * Usage:
 *   router.get("/me", CheckToken, controller)
 *   router.get("/admin", CheckToken, requireRoles("Admin"), controller)
 */
export const CheckToken = ErrorCatch(async (req, res, next) => {
  const headerToken = req.headers.token || req.headers.authorization;
  if (!headerToken) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Unauthorized — token is required",
    });
  }

  const token = String(headerToken).startsWith("Bearer ")
    ? String(headerToken).slice(7).trim()
    : String(headerToken).trim();

  let decoded;
  try {
    decoded = JWT.verify(token, process.env.SECRET_KEY || process.env.secretkey);
  } catch {
    return errorResponse(res, {
      statusCode: 401,
      message: "Unauthorized — invalid or expired token",
    });
  }

  req.auth = decoded;
  req.id = decoded.id || decoded._id;
  return next();
});

/**
 * Role guard — use after CheckToken.
 * @param {...string} roles
 */
export const requireRoles = (...roles) =>
  ErrorCatch(async (req, res, next) => {
    const role = req.auth?.role || req.user?.role;
    if (!role || !roles.includes(role)) {
      throw httpError("Forbidden — insufficient permissions", 403);
    }
    return next();
  });

/** Back-compat alias */
export const CheckAdmin = [CheckToken, requireRoles("Admin")];
