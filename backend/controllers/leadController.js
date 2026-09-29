const crypto = require('crypto');
const Lead = require('../models/Lead');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { tenantFilter } = require('../middleware/auth');

const DEFAULT_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

function safeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stagesFor(req) {
  return req.user.brokerage?.pipelineStages || DEFAULT_STAGES;
}

function emitLead(req, event, lead) {
  const io = req.app.get('io');
  const brokerageId = lead?.brokerageId?.toString();
  if (io && brokerageId) io.to(`brokerage:${brokerageId}`).emit(event, { lead });
}

const listLeads = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  const { stage, assignedTo, search } = req.query;

  if (stage) filter.stage = stage;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (search) {
    const expression = new RegExp(safeRegex(search.trim()), 'i');
    filter.$or = [{ name: expression }, { email: expression }, { phone: expression }];
  }

  const leads = await Lead.find(filter)
    .populate('assignedTo', 'name email role')
    .sort({ stage: 1, order: 1, createdAt: -1 })
    .limit(500);

  res.json({ success: true, count: leads.length, leads });
});

const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter(req) })
    .populate('assignedTo', 'name email role');

  if (!lead) throw new AppError('Lead not found', 404);
  res.json({ success: true, lead });
});

const createLead = asyncHandler(async (req, res) => {
  const { name, email, phone, source, notes, stage, assignedTo, dedupeKey, raw } = req.body;
  if (!name) throw new AppError('name is required', 400);

  const brokerageId = req.tenantId || req.body.brokerageId;
  if (!brokerageId) throw new AppError('A brokerage is required', 400);

  if (stage && !stagesFor(req).includes(stage)) {
    throw new AppError(`stage must be one of: ${stagesFor(req).join(', ')}`, 400);
  }

  let safeAssignee = null;
  if (assignedTo) {
    safeAssignee = await User.findOne({
      _id: assignedTo,
      brokerageId,
      role: 'advisor',
      isActive: true,
    });
    if (!safeAssignee) throw new AppError('assignedTo must be an active advisor in this brokerage', 400);
  }

  if (dedupeKey) {
    const duplicate = await Lead.findOne({ brokerageId, dedupeKey });
    if (duplicate) throw new AppError('A lead with this dedupeKey already exists', 409);
  }

  const lead = await Lead.create({
    brokerageId,
    name,
    email,
    phone,
    source,
    notes,
    stage: stage || 'New',
    assignedTo: safeAssignee?._id || null,
    dedupeKey,
    raw,
  });

  await lead.populate('assignedTo', 'name email role');
  emitLead(req, 'lead:created', lead);
  res.status(201).json({ success: true, lead });
});

const updateLead = asyncHandler(async (req, res) => {
  const allowed = ['name', 'email', 'phone', 'source', 'notes'];
  const updates = {};
  for (const field of allowed) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (!Object.keys(updates).length) throw new AppError('No editable fields supplied', 400);

  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('assignedTo', 'name email role');

  if (!lead) throw new AppError('Lead not found', 404);
  emitLead(req, 'lead:updated', lead);
  res.json({ success: true, lead });
});

const updateStage = asyncHandler(async (req, res) => {
  const { stage } = req.body;
  if (!stage || !stagesFor(req).includes(stage)) {
    throw new AppError(`stage must be one of: ${stagesFor(req).join(', ')}`, 400);
  }

  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, ...tenantFilter(req) },
    { $set: { stage, order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0 } },
    { new: true, runValidators: true }
  ).populate('assignedTo', 'name email role');

  if (!lead) throw new AppError('Lead not found', 404);
  emitLead(req, 'lead:stageChanged', lead);
  res.json({ success: true, lead });
});

const assignLead = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;
  if (!assignedTo) throw new AppError('assignedTo is required', 400);

  const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!lead) throw new AppError('Lead not found', 404);

  const advisor = await User.findOne({
    _id: assignedTo,
    brokerageId: lead.brokerageId,
    role: 'advisor',
    isActive: true,
  });
  if (!advisor) throw new AppError('Assignee must be an active advisor in this brokerage', 400);

  lead.assignedTo = advisor._id;
  await lead.save();
  await lead.populate('assignedTo', 'name email role');
  emitLead(req, 'lead:assigned', lead);
  res.json({ success: true, lead });
});

const convertToClient = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter(req) });
  if (!lead) throw new AppError('Lead not found', 404);
  if (lead.convertedClientId) throw new AppError('This lead is already converted to a client', 409);
  if (!lead.email) throw new AppError('Lead must have an email before conversion', 400);

  const email = lead.email.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) {
    if (String(existing.brokerageId) !== String(lead.brokerageId) || existing.role !== 'client') {
      throw new AppError('A user with this email already exists', 409);
    }
    lead.convertedClientId = existing._id;
    lead.stage = 'Won';
    await lead.save();
    await lead.populate('assignedTo', 'name email role');
    emitLead(req, 'lead:converted', lead);
    return res.json({ success: true, existingClient: true, lead, client: existing.toSafeJSON() });
  }

  const temporaryPassword = crypto.randomBytes(9).toString('base64url');
  const client = await User.create({
    brokerageId: lead.brokerageId,
    name: lead.name,
    email,
    password: temporaryPassword,
    role: 'client',
  });

  lead.convertedClientId = client._id;
  lead.stage = 'Won';
  await lead.save();
  await lead.populate('assignedTo', 'name email role');
  emitLead(req, 'lead:converted', lead);

  res.status(201).json({
    success: true,
    existingClient: false,
    lead,
    client: client.toSafeJSON(),
    temporaryPassword,
    message: 'Client created. Share the temporary password securely.',
  });
});

const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findOneAndDelete({ _id: req.params.id, ...tenantFilter(req) });
  if (!lead) throw new AppError('Lead not found', 404);
  emitLead(req, 'lead:deleted', lead);
  res.json({ success: true, message: 'Lead deleted' });
});

module.exports = {
  listLeads,
  getLead,
  createLead,
  updateLead,
  updateStage,
  assignLead,
  convertToClient,
  deleteLead,
};

// // const Lead = require('../models/Lead');
// // const User = require('../models/User');
// // const AppError = require('../utils/AppError');
// // const asyncHandler = require('../utils/asyncHandler');
// // const { tenantFilter } = require('../middleware/auth');

// // const DEFAULT_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

// // function safeRegex(value) {
// //   return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// // }

// // function stagesFor(req) {
// //   return req.user.brokerage?.pipelineStages || DEFAULT_STAGES;
// // }

// // const listLeads = asyncHandler(async (req, res) => {
// //   const filter = tenantFilter(req);
// //   const { stage, assignedTo, search } = req.query;

// //   if (stage) filter.stage = stage;
// //   if (assignedTo) filter.assignedTo = assignedTo;
// //   if (search) {
// //     const expression = new RegExp(safeRegex(search.trim()), 'i');
// //     filter.$or = [{ name: expression }, { email: expression }, { phone: expression }];
// //   }

// //   const leads = await Lead.find(filter)
// //     .populate('assignedTo', 'name email role')
// //     .sort({ stage: 1, order: 1, createdAt: -1 })
// //     .limit(500);

// //   res.json({ success: true, count: leads.length, leads });
// // });

// // const getLead = asyncHandler(async (req, res) => {
// //   const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter(req) })
// //     .populate('assignedTo', 'name email role');

// //   if (!lead) throw new AppError('Lead not found', 404);
// //   res.json({ success: true, lead });
// // });

// // const createLead = asyncHandler(async (req, res) => {
// //   const { name, email, phone, source, notes, stage, assignedTo, dedupeKey, raw } = req.body;
// //   if (!name) throw new AppError('name is required', 400);

// //   const brokerageId = req.tenantId || req.body.brokerageId;
// //   if (!brokerageId) throw new AppError('A brokerage is required', 400);

// //   if (stage && !stagesFor(req).includes(stage)) {
// //     throw new AppError(`stage must be one of: ${stagesFor(req).join(', ')}`, 400);
// //   }

// //   let safeAssignee = null;
// //   if (assignedTo) {
// //     safeAssignee = await User.findOne({
// //       _id: assignedTo,
// //       brokerageId,
// //       role: 'advisor',
// //       isActive: true,
// //     });
// //     if (!safeAssignee) throw new AppError('assignedTo must be an active advisor in this brokerage', 400);
// //   }

// //   if (dedupeKey) {
// //     const duplicate = await Lead.findOne({ brokerageId, dedupeKey });
// //     if (duplicate) throw new AppError('A lead with this dedupeKey already exists', 409);
// //   }

// //   const lead = await Lead.create({
// //     brokerageId,
// //     name,
// //     email,
// //     phone,
// //     source,
// //     notes,
// //     stage: stage || 'New',
// //     assignedTo: safeAssignee?._id || null,
// //     dedupeKey,
// //     raw,
// //   });

// //   await lead.populate('assignedTo', 'name email role');
// //   res.status(201).json({ success: true, lead });
// // });

// // const updateLead = asyncHandler(async (req, res) => {
// //   const allowed = ['name', 'email', 'phone', 'source', 'notes'];
// //   const updates = {};
// //   for (const field of allowed) {
// //     if (req.body[field] !== undefined) updates[field] = req.body[field];
// //   }

// //   if (!Object.keys(updates).length) throw new AppError('No editable fields supplied', 400);

// //   const lead = await Lead.findOneAndUpdate(
// //     { _id: req.params.id, ...tenantFilter(req) },
// //     { $set: updates },
// //     { new: true, runValidators: true }
// //   ).populate('assignedTo', 'name email role');

// //   if (!lead) throw new AppError('Lead not found', 404);
// //   res.json({ success: true, lead });
// // });

// // const updateStage = asyncHandler(async (req, res) => {
// //   const { stage } = req.body;
// //   if (!stage || !stagesFor(req).includes(stage)) {
// //     throw new AppError(`stage must be one of: ${stagesFor(req).join(', ')}`, 400);
// //   }

// //   const lead = await Lead.findOneAndUpdate(
// //     { _id: req.params.id, ...tenantFilter(req) },
// //     { $set: { stage, order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0 } },
// //     { new: true, runValidators: true }
// //   ).populate('assignedTo', 'name email role');

// //   if (!lead) throw new AppError('Lead not found', 404);
// //   res.json({ success: true, lead });
// // });

// // const assignLead = asyncHandler(async (req, res) => {
// //   const { assignedTo } = req.body;
// //   if (!assignedTo) throw new AppError('assignedTo is required', 400);

// //   const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter(req) });
// //   if (!lead) throw new AppError('Lead not found', 404);

// //   const advisor = await User.findOne({
// //     _id: assignedTo,
// //     brokerageId: lead.brokerageId,
// //     role: 'advisor',
// //     isActive: true,
// //   });
// //   if (!advisor) throw new AppError('Assignee must be an active advisor in this brokerage', 400);

// //   lead.assignedTo = advisor._id;
// //   await lead.save();
// //   await lead.populate('assignedTo', 'name email role');
// //   res.json({ success: true, lead });
// // });

// // const deleteLead = asyncHandler(async (req, res) => {
// //   const lead = await Lead.findOneAndDelete({ _id: req.params.id, ...tenantFilter(req) });
// //   if (!lead) throw new AppError('Lead not found', 404);
// //   res.json({ success: true, message: 'Lead deleted' });
// // });

// // module.exports = { listLeads, getLead, createLead, updateLead, updateStage, assignLead, deleteLead };
// const Lead = require('../models/Lead');
// const User = require('../models/User');
// const AppError = require('../utils/AppError');
// const asyncHandler = require('../utils/asyncHandler');
// const { tenantFilter } = require('../middleware/auth');

// const DEFAULT_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

// function safeRegex(value) {
//   return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// }

// function stagesFor(req) {
//   return req.user.brokerage?.pipelineStages || DEFAULT_STAGES;
// }

// function emitLead(req, event, lead) {
//   const io = req.app.get('io');
//   const brokerageId = lead?.brokerageId?.toString();
//   if (io && brokerageId) io.to(`brokerage:${brokerageId}`).emit(event, { lead });
// }

// const listLeads = asyncHandler(async (req, res) => {
//   const filter = tenantFilter(req);
//   const { stage, assignedTo, search } = req.query;

//   if (stage) filter.stage = stage;
//   if (assignedTo) filter.assignedTo = assignedTo;
//   if (search) {
//     const expression = new RegExp(safeRegex(search.trim()), 'i');
//     filter.$or = [{ name: expression }, { email: expression }, { phone: expression }];
//   }

//   const leads = await Lead.find(filter)
//     .populate('assignedTo', 'name email role')
//     .sort({ stage: 1, order: 1, createdAt: -1 })
//     .limit(500);

//   res.json({ success: true, count: leads.length, leads });
// });

// const getLead = asyncHandler(async (req, res) => {
//   const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter(req) })
//     .populate('assignedTo', 'name email role');

//   if (!lead) throw new AppError('Lead not found', 404);
//   res.json({ success: true, lead });
// });

// const createLead = asyncHandler(async (req, res) => {
//   const { name, email, phone, source, notes, stage, assignedTo, dedupeKey, raw } = req.body;
//   if (!name) throw new AppError('name is required', 400);

//   const brokerageId = req.tenantId || req.body.brokerageId;
//   if (!brokerageId) throw new AppError('A brokerage is required', 400);

//   if (stage && !stagesFor(req).includes(stage)) {
//     throw new AppError(`stage must be one of: ${stagesFor(req).join(', ')}`, 400);
//   }

//   let safeAssignee = null;
//   if (assignedTo) {
//     safeAssignee = await User.findOne({
//       _id: assignedTo,
//       brokerageId,
//       role: 'advisor',
//       isActive: true,
//     });
//     if (!safeAssignee) throw new AppError('assignedTo must be an active advisor in this brokerage', 400);
//   }

//   if (dedupeKey) {
//     const duplicate = await Lead.findOne({ brokerageId, dedupeKey });
//     if (duplicate) throw new AppError('A lead with this dedupeKey already exists', 409);
//   }

//   const lead = await Lead.create({
//     brokerageId,
//     name,
//     email,
//     phone,
//     source,
//     notes,
//     stage: stage || 'New',
//     assignedTo: safeAssignee?._id || null,
//     dedupeKey,
//     raw,
//   });

//   await lead.populate('assignedTo', 'name email role');
//   emitLead(req, 'lead:created', lead);
//   res.status(201).json({ success: true, lead });
// });

// const updateLead = asyncHandler(async (req, res) => {
//   const allowed = ['name', 'email', 'phone', 'source', 'notes'];
//   const updates = {};
//   for (const field of allowed) {
//     if (req.body[field] !== undefined) updates[field] = req.body[field];
//   }

//   if (!Object.keys(updates).length) throw new AppError('No editable fields supplied', 400);

//   const lead = await Lead.findOneAndUpdate(
//     { _id: req.params.id, ...tenantFilter(req) },
//     { $set: updates },
//     { new: true, runValidators: true }
//   ).populate('assignedTo', 'name email role');

//   if (!lead) throw new AppError('Lead not found', 404);
//   emitLead(req, 'lead:updated', lead);
//   res.json({ success: true, lead });
// });

// const updateStage = asyncHandler(async (req, res) => {
//   const { stage } = req.body;
//   if (!stage || !stagesFor(req).includes(stage)) {
//     throw new AppError(`stage must be one of: ${stagesFor(req).join(', ')}`, 400);
//   }

//   const lead = await Lead.findOneAndUpdate(
//     { _id: req.params.id, ...tenantFilter(req) },
//     { $set: { stage, order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0 } },
//     { new: true, runValidators: true }
//   ).populate('assignedTo', 'name email role');

//   if (!lead) throw new AppError('Lead not found', 404);
//   emitLead(req, 'lead:stageChanged', lead);
//   res.json({ success: true, lead });
// });

// const assignLead = asyncHandler(async (req, res) => {
//   const { assignedTo } = req.body;
//   if (!assignedTo) throw new AppError('assignedTo is required', 400);

//   const lead = await Lead.findOne({ _id: req.params.id, ...tenantFilter(req) });
//   if (!lead) throw new AppError('Lead not found', 404);

//   const advisor = await User.findOne({
//     _id: assignedTo,
//     brokerageId: lead.brokerageId,
//     role: 'advisor',
//     isActive: true,
//   });
//   if (!advisor) throw new AppError('Assignee must be an active advisor in this brokerage', 400);

//   lead.assignedTo = advisor._id;
//   await lead.save();
//   await lead.populate('assignedTo', 'name email role');
//   emitLead(req, 'lead:assigned', lead);
//   res.json({ success: true, lead });
// });

// const deleteLead = asyncHandler(async (req, res) => {
//   const lead = await Lead.findOneAndDelete({ _id: req.params.id, ...tenantFilter(req) });
//   if (!lead) throw new AppError('Lead not found', 404);
//   emitLead(req, 'lead:deleted', lead);
//   res.json({ success: true, message: 'Lead deleted' });
// });

// module.exports = { listLeads, getLead, createLead, updateLead, updateStage, assignLead, deleteLead };
