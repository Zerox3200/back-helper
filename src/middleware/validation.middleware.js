export const isvalid = (schema) => {
    return (req, res, next) => {
      const data = { ...req.body, ...req.params, ...req.query };
      const validateResult = schema.validate(data, { abortEarly: false });
      if (validateResult.error) {
        return res.json({
          success: false,
          error: validateResult.error.details,
        });
      }
      return next();
    };
  };
  