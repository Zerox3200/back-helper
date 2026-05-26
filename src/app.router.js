export const appRouter = (app, express) => {
  // middlware for display image in ubloads

  app.use("/uploads", express.static("uploads"));
  // parsing
  app.use(express.json());

  app.all("*", (req, res, next) => {
    return next(new Error("page not found", { cause: 404 }));
  });

  app.use((error, req, res, next) => {
    const statusCode = error.cause || error.statusCode || error.status || 500
    const message = error.message || 'An error occurred'

    const response = {
      success: false,
      message: message
    }

    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack
    }

    return res.status(statusCode).json(response)
  });
};
