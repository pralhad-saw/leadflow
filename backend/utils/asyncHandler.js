// Wraps async route handlers so a rejected promise goes to Express' error
// middleware instead of hanging the request. Saves try/catch in every controller.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
