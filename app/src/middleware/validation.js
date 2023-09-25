const Problem = require('api-problem');

/**
 * @function validator
 * Performs express request validation against a specified `schema`
 * @param {object} schema An object containing Joi validation schema definitions
 * @returns {function} Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationErrors = Object.entries(schema)
      .map(([prop, def]) => {
        const result = def.validate(req[prop], { abortEarly: false })?.error;
        return result ? [prop, result?.details] : undefined;
      })
      .filter(error => !!error);

    if (Object.keys(validationErrors).length) {
      return new Problem(422, {
        detail: validationErrors
          .flatMap(groups => groups[1]?.map(error => error?.message))
          .join('; '),
        instance: req.originalUrl,
        errors: Object.fromEntries(validationErrors)
      }).send(res);
    }
    else next();
  };
};

module.exports = {
  validate
};
