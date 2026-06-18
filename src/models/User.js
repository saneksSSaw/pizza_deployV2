const mongoose = require('mongoose');
const { normalizePhone } = require('../utils/phone');

const userSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true, index: true },
    telegramId: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 24 },
    phoneNorm: { type: String, unique: true, sparse: true, index: true },
    passHash: { type: String, select: false },
    salt: { type: String, select: false },
    role: { type: String, enum: ['customer', 'staff', 'owner'], default: 'customer' },
    bonusBalance: { type: Number, default: 0, min: 0 },
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    savedAddresses: { type: [String], default: [] },
    favs: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

userSchema.pre('save', function setPhoneNorm(next) {
  if (this.phone) {
    const norm = normalizePhone(this.phone);
    if (norm) this.phoneNorm = norm;
  }
  next();
});

userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
