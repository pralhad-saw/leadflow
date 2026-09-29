// const mongoose = require('mongoose');

// const brokerageSchema = new mongoose.Schema({
//   name: { type: String, required: true },
// }, { timestamps: true });

// module.exports = mongoose.model('Brokerage', brokerageSchema);

const mongoose = require('mongoose');

// Default Kanban columns. Stored PER brokerage so each tenant can later
// rename / reorder its own pipeline without touching anyone else's.
const DEFAULT_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

const brokerageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'slug can only contain a-z, 0-9 and -'],
    },
    isActive: { type: Boolean, default: true },
    pipelineStages: { type: [String], default: DEFAULT_STAGES },

    // Per-tenant secret used to authenticate inbound lead webhooks (Day 3).
    // select:false -> never leaks in a normal find().
    webhookSecret: { type: String, select: false },
  },
  { timestamps: true }
);

brokerageSchema.statics.DEFAULT_STAGES = DEFAULT_STAGES;

module.exports = mongoose.model('Brokerage', brokerageSchema);
