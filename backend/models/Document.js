const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    brokerageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brokerage', required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documentType: { type: String, required: true, trim: true },
    originalName: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    resourceType: { type: String, default: 'raw' },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Checking', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    failureReason: String,
  },
  { timestamps: true }
);

documentSchema.index({ brokerageId: 1, clientId: 1, createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
