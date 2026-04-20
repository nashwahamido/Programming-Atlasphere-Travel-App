/**
 * Middleware to check validation results and return errors.
 * For API routes: returns JSON { errors: [...] }
 * For page routes: pass a render function.
 */
const { validationResult } = require("express-validator");

/**
 * Returns 400 JSON with validation errors for API endpoints.
 */
function handleApiErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(function (e) { return e.msg; }),
    });
  }
  next();
}

/**
 * Returns a middleware that renders a view with error messages for page endpoints.
 * @param {string} view - The EJS view to render on error
 * @param {object} extraData - Extra data to pass to the view
 */
function handlePageErrors(view, extraData) {
  return function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render(view, Object.assign({
        error: errors.array().map(function (e) { return e.msg; }).join(", "),
        user: req.session ? req.session.user || null : null,
      }, extraData || {}));
    }
    next();
  };
}

module.exports = { handleApiErrors, handlePageErrors };