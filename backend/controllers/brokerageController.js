const crypto = require('crypto');
const Brokerage = require('../models/Brokerage');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/brokerages  (platform_admin only) */
const listBrokerages = asyncHandler(async (req, res) => {
  const brokerages = await Brokerage.find().sort({ createdAt: -1 });
  res.json({ success: true, count: brokerages.length, brokerages });
});

/**
 * POST /api/brokerages  (platform_admin only)
 * Onboards a new tenant + its first admin in one call.
 *
 * Not wrapped in a transaction to keep the free-tier setup simple; instead we
 * roll back the brokerage by hand if the admin user fails to create.
 */
const createBrokerage = asyncHandler(async (req, res) => {
  const { name, slug, adminName, adminEmail, adminPassword } = req.body;
  if (!name || !slug || !adminName || !adminEmail || !adminPassword) {
    throw new AppError('name, slug, adminName, adminEmail and adminPassword are required', 400);
  }
  if (String(adminPassword).length < 8) throw new AppError('adminPassword must be at least 8 characters', 400);

  if (await Brokerage.findOne({ slug: String(slug).toLowerCase() })) {
    throw new AppError('That slug is already taken', 409);
  }
  if (await User.findOne({ email: String(adminEmail).toLowerCase() })) {
    throw new AppError('That admin email is already in use', 409);
  }

  const brokerage = await Brokerage.create({
    name,
    slug,
    webhookSecret: crypto.randomBytes(24).toString('hex'),
  });

  let admin;
  try {
    admin = await User.create({
      brokerageId: brokerage._id,
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'brokerage_admin',
    });
  } catch (err) {
    await Brokerage.findByIdAndDelete(brokerage._id); // manual rollback
    throw err;
  }

  res.status(201).json({ success: true, brokerage, admin: admin.toSafeJSON() });
});

/** GET /api/brokerages/me -- the tenant the logged-in user belongs to. */
const getMyBrokerage = asyncHandler(async (req, res) => {
  if (!req.tenantId) throw new AppError('platform_admin does not belong to a brokerage', 400);
  const brokerage = await Brokerage.findById(req.tenantId);
  res.json({ success: true, brokerage });
});

/** GET /api/brokerages/:id/webhook-secret -- shown once in the admin UI (Day 3). */
const getWebhookSecret = asyncHandler(async (req, res) => {
  const id = req.user.role === 'platform_admin' ? req.params.id : req.tenantId;
  const brokerage = await Brokerage.findById(id).select('+webhookSecret slug');
  if (!brokerage) throw new AppError('Brokerage not found', 404);
  res.json({
    success: true,
    webhookSecret: brokerage.webhookSecret,
    webhookUrl: `${req.protocol}://${req.get('host')}/api/webhooks/leads/${brokerage.slug}`,
  });
});

module.exports = { listBrokerages, createBrokerage, getMyBrokerage, getWebhookSecret };
