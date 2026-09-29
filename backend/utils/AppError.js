// One error class for every "expected" failure (bad input, no auth, forbidden...).
// Anything that is NOT an AppError is treated as a real bug -> 500 + logged.
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
