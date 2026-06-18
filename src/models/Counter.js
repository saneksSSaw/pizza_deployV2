const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.statics.getNext = async function (name, session) {
  const opts = { new: true, upsert: true, setDefaultsOnInsert: true };
  if (session) opts.session = session;
  const doc = await this.findByIdAndUpdate(name, { $inc: { seq: 1 } }, opts).lean();
  return doc.seq;
};

counterSchema.statics.setIfGreater = async function (name, value) {
  const existing = await this.findById(name).lean();
  if (!existing || existing.seq < value) {
    await this.findByIdAndUpdate(name, { seq: value }, { upsert: true });
  }
};

module.exports = mongoose.model('Counter', counterSchema);
