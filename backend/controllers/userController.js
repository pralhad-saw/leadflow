const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { tenantFilter } = require('../middleware/auth');

/**
 * GET /api/users
 * Tenant-scoped by construction: a brokerage_admin can only ever see rows
 * where brokerageId === their own, because the filter comes from the session.
 */
const listUsers = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  if (req.query.role) filter.role = req.query.role;

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, count: users.length, users: users.map((u) => u.toSafeJSON()) });
});

/**
 * POST /api/users
 * brokerage_admin -> can create users ONLY inside their own brokerage.
 * platform_admin  -> must pass brokerageId explicitly.
 */
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    throw new AppError('name, email, password and role are required', 400);
  }
  if (String(password).length < 8) throw new AppError('Password must be at least 8 characters', 400);

  const allowedRoles = ['brokerage_admin', 'advisor', 'client'];
  if (!allowedRoles.includes(role)) throw new AppError(`role must be one of: ${allowedRoles.join(', ')}`, 400);

  // The critical line: for a brokerage_admin the tenant comes from the session,
  // NOT from the request body. Sending someone else's brokerageId does nothing.
  let brokerageId = req.tenantId;
  if (req.user.role === 'platform_admin') {
    if (!req.body.brokerageId) throw new AppError('platform_admin must supply brokerageId', 400);
    brokerageId = req.body.brokerageId;
  }

  const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (exists) throw new AppError('A user with this email already exists', 409);

  const user = await User.create({ brokerageId, name, email, password, role });
  res.status(201).json({ success: true, user: user.toSafeJSON() });
});

/** PATCH /api/users/:id/status  { isActive: boolean } */
const setUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!user) throw new AppError('User not found', 404);
  if (user.id === req.user.id) throw new AppError('You cannot disable your own account', 400);

  user.isActive = Boolean(req.body.isActive);
  user.tokenVersion += 1; // disabling must also kick them out right now
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, user: user.toSafeJSON() });
});

module.exports = { listUsers, createUser, setUserStatus };
