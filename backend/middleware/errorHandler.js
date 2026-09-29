const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
};

// Must keep 4 args -- that is how Express recognises an error handler.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for "${err.path}"`;
  }
  if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for: ${Object.keys(err.keyValue || {}).join(', ')}`;
  }
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err.name === 'MulterError' || message.includes('Only PDF, JPG and PNG')) {
    status = 400;
  }
  // optimisticConcurrency on Lead -> two people edited the same doc
  if (err.name === 'VersionError') {
    status = 409;
    message = 'This record was changed by someone else. Refresh and try again.';
  }

  if (status >= 500) console.error('UNHANDLED ERROR:', err);

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { stack: err.stack } : {}),
  });
};

module.exports = { notFound, errorHandler };
