const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['platform_admin', 'brokerage_admin', 'advisor', 'client'];

const userSchema = new mongoose.Schema(
  {
    // null ONLY for platform_admin (owner of the whole platform, not inside a tenant)
    brokerageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brokerage',
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // select:false -> password is never returned unless we explicitly ask for it
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, required: true },
    isActive: { type: Boolean, default: true },

    // bump this number to instantly invalidate every JWT already issued to this user
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ brokerageId: 1, role: 1 });

// Invariant: platform_admin has no tenant, everyone else MUST have one.
// userSchema.pre('validate', function (next) {
//   if (this.role === 'platform_admin') {
//     this.brokerageId = null;
//   } else if (!this.brokerageId) {
//     return next(new Error('brokerageId is required for non platform_admin users'));
//   }
//   next();
// });

// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 12);
//   next();
// });

userSchema.pre('validate', function () {
  if (this.role === 'platform_admin') {
    this.brokerageId = null;
  } else if (!this.brokerageId) {
    throw new Error('brokerageId is required for non platform_admin users');
  }
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Single place that decides what the API is allowed to expose about a user.
userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    brokerageId: this.brokerageId,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);


// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   brokerageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brokerage' },
//   name: String,
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   role: {
//     type: String,
//     enum: ['platform_admin', 'brokerage_admin', 'advisor', 'client'],
//     required: true
//   },
// }, { timestamps: true });

// module.exports = mongoose.model('User', userSchema);