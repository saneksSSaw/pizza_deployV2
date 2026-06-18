const Order = require('../models/Order');
const Counter = require('../models/Counter');
const { isJson } = require('../lib/storeMode');
const jsonStore = require('../storage/jsonStore');
const { toAPIOrder } = require('../utils/serializers');
const promoService = require('./promoService');
const userService = require('./userService');
const { CASHBACK_RATE } = require('../config/loyalty');

const MIN_ORDER_TOTAL = 50000;

function calcOriginalTotal(body) {
  const subtotal = Number(body.subtotal) || 0;
  const promoDiscount = Number(body.promoDiscount) || 0;
  const deliveryFee = Number(body.deliveryFee) || 0;
  return Math.max(0, subtotal - promoDiscount + deliveryFee);
}

function buildOrderPayload(body, orderNumber, totals) {
  const { originalTotal, bonusUsed, finalTotal, bonusEarned } = totals;
  return {
    orderNumber,
    id: orderNumber,
    name: body.name.trim(),
    phone: body.phone.trim(),
    address: body.address.trim(),
    note: (body.note || '').trim().slice(0, 500),
    items: body.items.map((it) => ({
      name: it.name.trim(),
      size: it.size ?? null,
      qty: Number(it.qty),
      price: Number(it.price),
      dough: it.dough || null,
      toppings: Array.isArray(it.toppings) ? it.toppings : [],
    })),
    subtotal: Number(body.subtotal) || 0,
    deliveryFee: Number(body.deliveryFee) || 0,
    deliveryLabel: body.deliveryLabel || '',
    deliveryZone: body.deliveryZone || '',
    district: body.district || '',
    promo: body.promo || null,
    promoDiscount: Number(body.promoDiscount) || 0,
    totalBeforeBonus: originalTotal,
    bonusUsed,
    bonusEarned,
    total: finalTotal,
    payment: body.payment || 'cash',
    status: 'new',
    createdAt: new Date().toISOString(),
    statusUpdatedAt: new Date().toISOString(),
  };
}

async function getAllOrders(limit = 200) {
  if (isJson()) {
    const state = jsonStore.loadOrdersState();
    return state.orders.slice(0, limit).map((o) => toAPIOrder(o));
  }
  const docs = await Order.find().sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map((d) => toAPIOrder(d));
}

async function getOrderByNumber(orderNumber) {
  if (isJson()) {
    const state = jsonStore.loadOrdersState();
    const order = state.orders.find((o) => o.id === orderNumber);
    return order ? toAPIOrder(order) : null;
  }
  const doc = await Order.findOne({ orderNumber }).lean();
  return doc ? toAPIOrder(doc) : null;
}

async function updateOrderStatus(orderNumber, status) {
  const allowed = ['new', 'cooking', 'delivery', 'done', 'cancelled'];
  if (!allowed.includes(status)) {
    const err = new Error('Неверный статус');
    err.statusCode = 400;
    throw err;
  }
  if (isJson()) {
    const state = jsonStore.loadOrdersState();
    const order = state.orders.find((o) => o.id === orderNumber);
    if (!order) {
      const err = new Error('Заказ не найден');
      err.statusCode = 404;
      throw err;
    }
    order.status = status;
    order.statusUpdatedAt = new Date().toISOString();
    jsonStore.saveOrdersState(state);
    return toAPIOrder(order);
  }
  const doc = await Order.findOneAndUpdate(
    { orderNumber },
    { status, statusUpdatedAt: new Date() },
    { new: true, runValidators: true }
  ).lean();
  if (!doc) {
    const err = new Error('Заказ не найден');
    err.statusCode = 404;
    throw err;
  }
  return toAPIOrder(doc);
}

async function createOrder(body, options = {}) {
  const originalTotal = calcOriginalTotal(body);
  if (originalTotal < MIN_ORDER_TOTAL) {
    const err = new Error('Минимальная сумма заказа — 50 000 сум');
    err.statusCode = 400;
    throw err;
  }

  const useBonus = body.useBonus === true;
  let loyaltyUser = null;
  let mongoUserId = null;

  if (options.legacyId) {
    loyaltyUser = await userService.findByLegacyId(options.legacyId);
  }
  if (!loyaltyUser && body.phone) {
    loyaltyUser = await userService.findOrCreateByPhone(body.phone, body.name);
  }
  if (loyaltyUser) {
    mongoUserId = loyaltyUser._id || null;
  }

  let bonusUsed = 0;
  if (useBonus) {
    if (!loyaltyUser) {
      const err = new Error('Укажите телефон для списания бонусов');
      err.statusCode = 400;
      throw err;
    }
    const balance = loyaltyUser.bonusBalance || 0;
    bonusUsed = Math.min(balance, originalTotal);
    if (bonusUsed <= 0) {
      const err = new Error('На балансе нет бонусов для списания');
      err.statusCode = 400;
      throw err;
    }
    if (bonusUsed > balance) {
      const err = new Error('Нельзя списать больше бонусов, чем есть на балансе');
      err.statusCode = 400;
      throw err;
    }
    if (bonusUsed > originalTotal) {
      const err = new Error('Нельзя списать больше бонусов, чем сумма заказа');
      err.statusCode = 400;
      throw err;
    }
  }

  const finalTotal = originalTotal - bonusUsed;
  const bonusEarned = Math.floor(finalTotal * CASHBACK_RATE);

  if (body.promo) {
    try {
      await promoService.consumePromo(body.promo);
    } catch (err) {
      err.statusCode = 400;
      throw err;
    }
  }

  let bonusDeducted = false;
  try {
    if (useBonus && bonusUsed > 0) {
      const deduct = await userService.deductBonus(loyaltyUser, bonusUsed);
      loyaltyUser = deduct.user;
      bonusDeducted = true;
    }

    const totals = { originalTotal, bonusUsed, finalTotal, bonusEarned };
    let order;
    let loyaltyResult = { bonusEarned: 0, bonusBalance: loyaltyUser?.bonusBalance || 0 };

    if (isJson()) {
      const state = jsonStore.loadOrdersState();
      const orderNumber = state.counter++;
      order = buildOrderPayload(body, orderNumber, totals);
      state.orders.unshift(order);
      if (state.orders.length > 200) state.orders.pop();
      jsonStore.saveOrdersState(state);
      if (loyaltyUser) {
        loyaltyResult = await userService.applyLoyaltyAfterOrder(loyaltyUser, order, finalTotal);
      }
    } else {
      const orderNumber = await Counter.getNext('orders');
      const payload = buildOrderPayload(body, orderNumber, totals);
      delete payload.id;
      delete payload.createdAt;
      delete payload.statusUpdatedAt;
      const created = await Order.create({
        ...payload,
        userId: mongoUserId,
        statusUpdatedAt: new Date(),
      });
      order = toAPIOrder(created);
      if (loyaltyUser) {
        loyaltyResult = await userService.applyLoyaltyAfterOrder(loyaltyUser, created, finalTotal);
      }
    }

    const apiOrder = toAPIOrder(order);
    return {
      ...apiOrder,
      bonusUsed,
      bonusEarned: loyaltyResult.bonusEarned,
      bonusBalance: loyaltyResult.bonusBalance,
      totalBeforeBonus: originalTotal,
    };
  } catch (err) {
    if (bonusDeducted && loyaltyUser && bonusUsed > 0) {
      await userService.refundBonus(loyaltyUser, bonusUsed);
    }
    throw err;
  }
}

async function computeAnalytics(period) {
  const days = period === 'month' ? 30 : 7;
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  let orders;
  if (isJson()) {
    orders = jsonStore.loadOrdersState().orders.filter((o) => o.createdAt && new Date(o.createdAt) >= start);
  } else {
    orders = await Order.find({ createdAt: { $gte: start } }).lean();
  }

  const dayMap = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  orders.forEach((o) => {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    if (dayMap[key] !== undefined) dayMap[key] += o.total || 0;
  });

  const pizzaCounts = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const name = (item.name || 'Другое').trim();
      pizzaCounts[name] = (pizzaCounts[name] || 0) + (item.qty || 1);
    });
  });
  const topPizzas = Object.entries(pizzaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, qty]) => ({ name, qty }));

  const hourCounts = Array(24).fill(0);
  orders.forEach((o) => {
    hourCounts[new Date(o.createdAt).getHours()]++;
  });

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const orderCount = orders.length;

  return {
    period,
    labels: Object.keys(dayMap).map((k) => {
      const d = new Date(k + 'T12:00:00');
      return d.toLocaleDateString('ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: period === 'month' ? 'short' : undefined,
      });
    }),
    revenue: Object.values(dayMap),
    topPizzas,
    hours: hourCounts.map((count, hour) => ({ hour, count })),
    summary: {
      totalRevenue,
      orderCount,
      avgOrder: orderCount ? Math.round(totalRevenue / orderCount) : 0,
    },
  };
}

module.exports = {
  getAllOrders,
  getOrderByNumber,
  updateOrderStatus,
  createOrder,
  computeAnalytics,
  calcOriginalTotal,
};
