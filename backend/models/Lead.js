const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    brokerageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    source: { type: String, default: 'manual' }, // webform | zapier | manual | ...

    stage: { type: String, default: 'New' },
    order: { type: Number, default: 0 }, // position inside its Kanban column

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: String,

    // --- duplicate detection (Day 3) ---
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    // idempotency key = hash of the inbound webhook payload. Unique PER tenant,
    // so the same form submitted twice cannot create two leads.
    dedupeKey: { type: String },

    convertedClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    raw: mongoose.Schema.Types.Mixed, // original webhook body, kept for debugging
  },
  {
    timestamps: true,
    // Makes Mongoose check __v on save() -> two advisors editing the same lead
    // at the same moment produce a VersionError instead of silently overwriting.
    optimisticConcurrency: true,
  }
);

// Every index starts with brokerageId: queries are always tenant-scoped first.
leadSchema.index({ brokerageId: 1, stage: 1, order: 1 });
leadSchema.index({ brokerageId: 1, email: 1 });
// leadSchema.index({ brokerageId: 1, dedupeKey: 1 }, { unique: true, sparse: true });
leadSchema.index(
  { brokerageId: 1, dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      dedupeKey: { $type: "string" }
    }
  }
);
module.exports = mongoose.model('Lead', leadSchema);


// const mongoose = require('mongoose');

// const leadSchema = new mongoose.Schema({
//   brokerageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brokerage', required: true },
//   name: String,
//   email: String,
//   phone: String,
//   source: String,
//   stage: {
//     type: String,
//     enum: ['New', 'Contacted', 'Qualified', 'Won', 'Lost'],
//     default: 'New'
//   },
//   assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
// }, { timestamps: true });

// module.exports = mongoose.model('Lead', leadSchema);