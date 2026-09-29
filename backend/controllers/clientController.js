const Lead = require('../models/Lead');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/client/application */
const getMyApplication = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({
    brokerageId: req.tenantId,
    convertedClientId: req.user.id,
  }).populate('assignedTo', 'name email');

  if (!lead) throw new AppError('No mortgage application found', 404);

  res.json({
    success: true,
    application: {
      id: lead._id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      stage: lead.stage,
      source: lead.source,
      assignedTo: lead.assignedTo,
      convertedAt: lead.updatedAt,
    },
  });
});

module.exports = { getMyApplication };
