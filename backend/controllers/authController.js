const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/auth/login
 * There is NO public signup. Users are provisioned by a platform_admin or a
 * brokerage_admin, so nobody can self-register into someone else's tenant.
 */
const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  if (!email || !password) throw new AppError('Email and password are required', 400);

  const user = await User.findOne({ email }).select('+password');

  // Identical error for "no such user" and "wrong password" -> no user enumeration.
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.isActive) throw new AppError('This account is disabled', 403);

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, token: signToken(user), user: user.toSafeJSON() });
});

/** GET /api/auth/me -- used by the frontend to restore a session on refresh. */
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

/** POST /api/auth/change-password -- invalidates every existing token. */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError('Both passwords are required', 400);
  if (String(newPassword).length < 8) throw new AppError('New password must be at least 8 characters', 400);

  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = newPassword;
  user.tokenVersion += 1; // kill all old sessions
  await user.save();

  res.json({ success: true, token: signToken(user), message: 'Password changed, other sessions logged out' });
});

/** POST /api/auth/logout-all */
const logoutAll = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
  res.json({ success: true, message: 'Logged out of all devices' });
});

module.exports = { login, me, changePassword, logoutAll };
