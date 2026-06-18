const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    legacyId: { type: Number, unique: true, sparse: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    category: { type: String, required: true, trim: true, index: true },
    categories: { type: [String], default: [] },
    prices: {
      25: { type: Number, min: 0 },
      30: { type: Number, min: 0 },
      35: { type: Number, min: 0 },
    },
    image: { type: String, default: '' },
    badge: { type: String, default: '' },
    badgeColor: { type: String, default: '' },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

menuItemSchema.index({ active: 1, sortOrder: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
