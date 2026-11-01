const validate = (validationFunction) => {
  return (req, res, next) => {
    const errors = validationFunction(req);

    if (errors.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors,
      });
    }

    next();
  };
};

export default validate;
