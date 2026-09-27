const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  brokerageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brokerage', required: true },
  name: String,
  email: String,
  phone: String,
  source: String,
  stage: {
    type: String,
    enum: ['New', 'Contacted', 'Qualified', 'Won', 'Lost'],
    default: 'New'
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);