const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    size: { type: Number, default: null },
    qty: { type: Number, required: true, min: 1, max: 99 },
    price: { type: Number, required: true, min: 0 },
    dough: { type: String, default: null },
    toppings: { type: [String], default: [] },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 24 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    note: { type: String, default: '', maxlength: 500 },
    items: { type: [orderItemSchema], required: true, validate: [(v) => v.length > 0, 'Корзина пуста'] },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    deliveryLabel: { type: String, default: '' },
    deliveryZone: { type: String, default: '' },
    district: { type: String, default: '' },
    promo: { type: String, default: null },
    promoDiscount: { type: Number, default: 0, min: 0 },
    totalBeforeBonus: { type: Number, default: 0, min: 0 },
    bonusUsed: { type: Number, default: 0, min: 0 },
    bonusEarned: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    payment: { type: String, enum: ['cash', 'card', 'click', 'payme'], default: 'cash' },
    status: {
      type: String,
      enum: ['new', 'cooking', 'delivery', 'done', 'cancelled'],
      default: 'new',
      index: true,
    },
    statusUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
