// const crypto = require('crypto');
// const Brokerage = require('../models/Brokerage');
// const Lead = require('../models/Lead');
// const AppError = require('../utils/AppError');
// const asyncHandler = require('../utils/asyncHandler');

// function makeDedupeKey(payload) {
//   if (payload.dedupeKey) return String(payload.dedupeKey).trim();

//   // If the external tool does not provide an idempotency key, create a stable
//   // fallback from the identifying fields. This prevents the same form retry
//   // from creating multiple identical leads.
//   const identity = [payload.email, payload.phone, payload.name, payload.source]
//     .map((value) => String(value || '').trim().toLowerCase())
//     .join('|');

//   return crypto.createHash('sha256').update(identity).digest('hex');
// }

// function safeSecretEqual(received, expected) {
//   const a = Buffer.from(String(received || ''));
//   const b = Buffer.from(String(expected || ''));
//   return a.length === b.length && crypto.timingSafeEqual(a, b);
// }

// /**
//  * POST /api/webhooks/leads/:brokerageSlug
//  *
//  * This endpoint is intentionally not JWT-protected because the caller is an
//  * external form/tool. It is protected by the brokerage-specific secret.
//  */
// const receiveLeadWebhook = asyncHandler(async (req, res) => {
//   const brokerage = await Brokerage.findOne({
//     slug: String(req.params.brokerageSlug).toLowerCase(),
//     isActive: true,
//   }).select('+webhookSecret');

//   if (!brokerage) throw new AppError('Brokerage not found', 404);

//   const suppliedSecret = req.get('x-webhook-secret') || req.get('x-api-key');
//   if (!brokerage.webhookSecret || !safeSecretEqual(suppliedSecret, brokerage.webhookSecret)) {
//     throw new AppError('Invalid webhook secret', 401);
//   }

//   const { name, email, phone, source, notes, stage } = req.body;
//   if (!name || (!email && !phone)) {
//     throw new AppError('name and either email or phone are required', 400);
//   }

//   const allowedStages = brokerage.pipelineStages || ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
//   if (stage && !allowedStages.includes(stage)) {
//     throw new AppError(`stage must be one of: ${allowedStages.join(', ')}`, 400);
//   }

//   const dedupeKey = makeDedupeKey(req.body);
//   const existing = await Lead.findOne({ brokerageId: brokerage._id, dedupeKey })
//     .populate('assignedTo', 'name email role');

//   // Idempotent retry: return the original lead instead of creating a second one.
//   if (existing) {
//     return res.status(200).json({
//       success: true,
//       duplicate: true,
//       message: 'Lead already exists; returning the original lead',
//       lead: existing,
//     });
//   }

//   const possibleDuplicate = await Lead.findOne({
//     brokerageId: brokerage._id,
//     $or: [
//       ...(email ? [{ email: String(email).trim().toLowerCase() }] : []),
//       ...(phone ? [{ phone: String(phone).trim() }] : []),
//     ],
//   }).sort({ createdAt: 1 });

//   const lead = await Lead.create({
//     brokerageId: brokerage._id,
//     name,
//     email,
//     phone,
//     source: source || 'webhook',
//     notes,
//     stage: stage || 'New',
//     dedupeKey,
//     isDuplicate: Boolean(possibleDuplicate),
//     duplicateOf: possibleDuplicate?._id || null,
//     raw: req.body,
//   });

//   res.status(201).json({
//     success: true,
//     duplicate: Boolean(possibleDuplicate),
//     lead,
//   });
// });

// module.exports = { receiveLeadWebhook };
const crypto = require('crypto');
const Brokerage = require('../models/Brokerage');
const Lead = require('../models/Lead');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function makeDedupeKey(payload) {
  if (payload.dedupeKey) return String(payload.dedupeKey).trim();

  // If the external tool does not provide an idempotency key, create a stable
  // fallback from the identifying fields. This prevents the same form retry
  // from creating multiple identical leads.
  const identity = [payload.email, payload.phone, payload.name, payload.source]
    .map((value) => String(value || '').trim().toLowerCase())
    .join('|');

  return crypto.createHash('sha256').update(identity).digest('hex');
}

function safeSecretEqual(received, expected) {
  const a = Buffer.from(String(received || ''));
  const b = Buffer.from(String(expected || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * POST /api/webhooks/leads/:brokerageSlug
 *
 * This endpoint is intentionally not JWT-protected because the caller is an
 * external form/tool. It is protected by the brokerage-specific secret.
 */
const receiveLeadWebhook = asyncHandler(async (req, res) => {
  const brokerage = await Brokerage.findOne({
    slug: String(req.params.brokerageSlug).toLowerCase(),
    isActive: true,
  }).select('+webhookSecret');

  if (!brokerage) throw new AppError('Brokerage not found', 404);

  const suppliedSecret = req.get('x-webhook-secret') || req.get('x-api-key');
  if (!brokerage.webhookSecret || !safeSecretEqual(suppliedSecret, brokerage.webhookSecret)) {
    throw new AppError('Invalid webhook secret', 401);
  }

  const { name, email, phone, source, notes, stage } = req.body;
  if (!name || (!email && !phone)) {
    throw new AppError('name and either email or phone are required', 400);
  }

  const allowedStages = brokerage.pipelineStages || ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
  if (stage && !allowedStages.includes(stage)) {
    throw new AppError(`stage must be one of: ${allowedStages.join(', ')}`, 400);
  }

  const dedupeKey = makeDedupeKey(req.body);
  const existing = await Lead.findOne({ brokerageId: brokerage._id, dedupeKey })
    .populate('assignedTo', 'name email role');

  // Idempotent retry: return the original lead instead of creating a second one.
  if (existing) {
    return res.status(200).json({
      success: true,
      duplicate: true,
      message: 'Lead already exists; returning the original lead',
      lead: existing,
    });
  }

  const possibleDuplicate = await Lead.findOne({
    brokerageId: brokerage._id,
    $or: [
      ...(email ? [{ email: String(email).trim().toLowerCase() }] : []),
      ...(phone ? [{ phone: String(phone).trim() }] : []),
    ],
  }).sort({ createdAt: 1 });

  const lead = await Lead.create({
    brokerageId: brokerage._id,
    name,
    email,
    phone,
    source: source || 'webhook',
    notes,
    stage: stage || 'New',
    dedupeKey,
    isDuplicate: Boolean(possibleDuplicate),
    duplicateOf: possibleDuplicate?._id || null,
    raw: req.body,
  });

  const io = req.app.get('io');
  if (io) io.to(`brokerage:${brokerage._id}`).emit('lead:created', { lead });

  res.status(201).json({
    success: true,
    duplicate: Boolean(possibleDuplicate),
    lead,
  });
});

module.exports = { receiveLeadWebhook };
