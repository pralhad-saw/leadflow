const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  brokerageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brokerage' },
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['platform_admin', 'brokerage_admin', 'advisor', 'client'],
    required: true
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);