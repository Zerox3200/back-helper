import mongoose from "mongoose";
import { errorResponse } from "./helpers/response.helpers.js";

export const appRouter = (app, express) => {
  app.use(
    "/uploads",
    express.static("uploads", {
      dotfiles: "deny",
      fallthrough: true,
      etag: false,
      lastModified: true,
      maxAge: 0,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    return res.status(dbConnected ? 200 : 503).json({
      success: dbConnected,
      statusCode: dbConnected ? 200 : 503,
      message: dbConnected ? "ok" : "degraded",
      data: {
        status: dbConnected ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        database: dbConnected ? "connected" : "disconnected",
      },
      errors: null,
    });
  });

  // Feature modules — mount here as you add them
  // app.use("/foos", fooRouter);

  app.all("*", (req, res, next) => {
    const err = new Error("Route not found");
    err.statusCode = 404;
    return next(err);
  });

  // Global error handler — same envelope as success/error helpers
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    const statusCode =
      error.statusCode ||
      error.cause ||
      error.status ||
      (error.name === "ValidationError" ? 400 : 500);

    const isProduction =
      String(process.env.NODE_ENV || "").toLowerCase() === "production";

    return errorResponse(res, {
      statusCode: typeof statusCode === "number" ? statusCode : 500,
      message: error.message || "Internal server error",
      data: isProduction ? null : error.data ?? null,
      errors: error.errors ?? null,
    });
  });
};
