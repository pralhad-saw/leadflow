const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * protect -- authenticate the request and pin it to exactly one tenant.
 *
 * Deliberate choice: we hit Mongo on every request instead of trusting the JWT
 * payload. Cost is one indexed _id lookup (~1ms); benefit is that deactivating
 * a user, disabling a brokerage, or bumping tokenVersion takes effect
 * immediately instead of after the token expires. Cache in Redis if it hurts.
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new AppError('Not authenticated', 401);

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw new AppError(
      err.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token',
      401
    );
  }

  const user = await User.findById(payload.sub).populate('brokerageId', 'name slug isActive pipelineStages');
  if (!user || !user.isActive) throw new AppError('Account not found or disabled', 401);

  // token issued before a password change / forced logout
  if ((payload.tv ?? 0) !== user.tokenVersion) {
    throw new AppError('Session revoked, please log in again', 401);
  }

  if (user.role !== 'platform_admin') {
    if (!user.brokerageId) throw new AppError('User has no brokerage', 403);
    if (user.brokerageId.isActive === false) throw new AppError('This brokerage is disabled', 403);
  }

  req.user = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    brokerageId: user.brokerageId ? user.brokerageId._id.toString() : null,
    brokerage: user.brokerageId || null,
  };

  // THE tenant id for this request. Controllers must use this and never
  // req.body.brokerageId / req.params.brokerageId.
  req.tenantId = req.user.brokerageId;

  next();
});

/** requireRole('brokerage_admin', 'advisor') */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated', 401));
  if (!roles.includes(req.user.role)) {
    return next(new AppError('Forbidden: your role cannot perform this action', 403));
  }
  next();
};

/**
 * Builds the mandatory tenant filter for EVERY query on tenant-owned data.
 * Usage: await Lead.find(tenantFilter(req, { stage: 'New' }))
 *
 * Because the filter is applied server-side from the session, guessing another
 * brokerage's lead id just returns 404 -- the id never matches the filter.
 */
function tenantFilter(req, extra = {}) {
  if (req.user.role === 'platform_admin') {
    // platform admin can look across tenants, but must opt in explicitly
    return req.query.brokerageId ? { brokerageId: req.query.brokerageId, ...extra } : { ...extra };
  }
  return { brokerageId: req.tenantId, ...extra };
}

/** Last-line defence when you already have a document in hand. */
function assertSameTenant(doc, req) {
  if (!doc) throw new AppError('Not found', 404);
  if (req.user.role === 'platform_admin') return doc;
  if (String(doc.brokerageId) !== String(req.tenantId)) {
    // 404, not 403 -- do not confirm that the id exists in another tenant
    throw new AppError('Not found', 404);
  }
  return doc;
}

module.exports = { protect, requireRole, tenantFilter, assertSameTenant };
