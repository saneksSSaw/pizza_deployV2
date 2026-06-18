const Promo = require('../models/Promo');
const { isJson } = require('../lib/storeMode');
const jsonStore = require('../storage/jsonStore');
const { toAPIPromo } = require('../utils/serializers');

const DEFAULT_PROMOS = [
  { code: 'PIZZA10', type: 'percent', value: 10, label: '−10% на заказ', active: true, usageLimit: 0, usedCount: 0 },
  { code: 'SERGELI', type: 'fixed', value: 15000, label: '−15 000 сум', active: true, usageLimit: 0, usedCount: 0 },
  { code: 'MAKERS', type: 'percent', value: 15, label: '−15% на заказ', active: true, usageLimit: 100, usedCount: 0 },
  { code: 'PIZZA2026', type: 'percent', value: 20, label: '−20% (акция 2026)', active: true, usageLimit: 50, usedCount: 0 },
];

async function ensureDefaults() {
  if (isJson()) {
    jsonStore.loadPromos();
    return;
  }
  const count = await Promo.countDocuments();
  if (count === 0) {
    await Promo.insertMany(DEFAULT_PROMOS, { ordered: false });
  }
}

async function listPromos() {
  if (isJson()) return jsonStore.loadPromos().map(toAPIPromo);
  await ensureDefaults();
  const docs = await Promo.find().sort({ createdAt: -1 }).lean();
  return docs.map(toAPIPromo);
}

async function findActivePromo(code) {
  const upper = code.toUpperCase();
  if (isJson()) {
    const promo = jsonStore.loadPromos().find((p) => p.code === upper && p.active);
    if (!promo) return null;
    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) return null;
    return toAPIPromo(promo);
  }
  await ensureDefaults();
  const promo = await Promo.findOne({ code: upper, active: true }).lean();
  if (!promo) return null;
  if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) return null;
  return toAPIPromo(promo);
}

async function consumePromo(code) {
  const upper = code.toUpperCase();
  if (isJson()) {
    const promos = jsonStore.loadPromos();
    const promo = promos.find((p) => p.code === upper && p.active);
    if (!promo) throw new Error('Промокод недействителен');
    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
      throw new Error('Промокод недействителен');
    }
    promo.usedCount = (promo.usedCount || 0) + 1;
    jsonStore.savePromos(promos);
    return toAPIPromo(promo);
  }
  const promo = await Promo.findOneAndUpdate(
    {
      code: upper,
      active: true,
      $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
    },
    { $inc: { usedCount: 1 } },
    { new: true }
  );
  if (!promo) throw new Error('Промокод недействителен');
  return toAPIPromo(promo);
}

async function createPromo(data) {
  const code = data.code.toUpperCase();
  if (isJson()) {
    const promos = jsonStore.loadPromos();
    if (promos.find((p) => p.code === code)) {
      const err = new Error('Такой промокод уже существует');
      err.statusCode = 409;
      throw err;
    }
    promos.push({
      code,
      type: data.type,
      value: data.value,
      label: data.label,
      active: true,
      usageLimit: data.usageLimit || 0,
      usedCount: 0,
      createdAt: new Date().toISOString(),
    });
    jsonStore.savePromos(promos);
    return listPromos();
  }
  const existing = await Promo.findOne({ code });
  if (existing) {
    const err = new Error('Такой промокод уже существует');
    err.statusCode = 409;
    throw err;
  }
  await Promo.create({
    code,
    type: data.type,
    value: data.value,
    label: data.label,
    active: true,
    usageLimit: data.usageLimit || 0,
    usedCount: 0,
  });
  return listPromos();
}

async function togglePromo(code) {
  const upper = code.toUpperCase();
  if (isJson()) {
    const promos = jsonStore.loadPromos();
    const promo = promos.find((p) => p.code === upper);
    if (!promo) {
      const err = new Error('Промокод не найден');
      err.statusCode = 404;
      throw err;
    }
    promo.active = !promo.active;
    jsonStore.savePromos(promos);
    return listPromos();
  }
  const promo = await Promo.findOne({ code: upper });
  if (!promo) {
    const err = new Error('Промокод не найден');
    err.statusCode = 404;
    throw err;
  }
  promo.active = !promo.active;
  await promo.save();
  return listPromos();
}

module.exports = {
  ensureDefaults,
  listPromos,
  findActivePromo,
  consumePromo,
  createPromo,
  togglePromo,
};
