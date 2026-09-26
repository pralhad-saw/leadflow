const mongoose = require('mongoose');

const brokerageSchema = new mongoose.Schema({
  name: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Brokerage', brokerageSchema);