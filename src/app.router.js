export const appRouter = (app, express) => {
  // middlware for display image in ubloads

  app.use("/uploads", express.static("uploads"));
  // parsing
  app.use(express.json());

  app.all("*", (req, res, next) => {
    return next(new Error("page not found", { cause: 404 }));
  });
  // glopal error handler
  app.use((error, req, res, next) => {
    return res
      .status(error.cause || 500)
      .json({ success: false, message: error.message, stack: error.stack });
  });
};
