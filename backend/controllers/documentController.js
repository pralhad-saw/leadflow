const path = require('path');
const Document = require('../models/Document');
const Lead = require('../models/Lead');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBuffer } = require('../config/cloudinary');

async function findClientApplication(clientId, brokerageId) {
  const client = await User.findOne({ _id: clientId, brokerageId, role: 'client', isActive: true });
  if (!client) throw new AppError('Client not found', 404);

  const lead = await Lead.findOne({ brokerageId, convertedClientId: clientId });
  if (!lead) throw new AppError('Client application not found', 404);
  return { client, lead };
}

const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('A file is required', 400);
  const documentType = String(req.body.documentType || 'other').trim().slice(0, 80);

  // A client is always taken from the authenticated session, never from body data.
  const { client, lead } = await findClientApplication(req.user.id, req.tenantId);

  const safeBase = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
  const result = await uploadBuffer(req.file.buffer, {
    folder: `leadflow/${req.tenantId}/${client._id}`,
    public_id: `${Date.now()}-${safeBase}`,
    resource_type: 'auto',
  });

  const document = await Document.create({
    brokerageId: req.tenantId,
    clientId: client._id,
    leadId: lead._id,
    uploadedBy: req.user.id,
    documentType,
    originalName: req.file.originalname,
    cloudinaryPublicId: result.public_id,
    secureUrl: result.secure_url,
    resourceType: result.resource_type || 'raw',
    mimeType: req.file.mimetype,
    size: req.file.size,
    status: 'Pending',
  });

  res.status(201).json({ success: true, document });
});

const listMyDocuments = asyncHandler(async (req, res) => {
  await findClientApplication(req.user.id, req.tenantId);
  const documents = await Document.find({ brokerageId: req.tenantId, clientId: req.user.id })
    .sort({ createdAt: -1 });
  res.json({ success: true, count: documents.length, documents });
});

const listClientDocuments = asyncHandler(async (req, res) => {
  await findClientApplication(req.params.clientId, req.tenantId);
  const documents = await Document.find({ brokerageId: req.tenantId, clientId: req.params.clientId })
    .populate('uploadedBy', 'name email role')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: documents.length, documents });
});

module.exports = { uploadDocument, listMyDocuments, listClientDocuments };
