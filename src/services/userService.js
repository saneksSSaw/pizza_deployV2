const User = require('../models/User');
const Order = require('../models/Order');
const { isJson } = require('../lib/storeMode');
const jsonStore = require('../storage/jsonStore');
const { hashPass, checkPass } = require('../utils/jwt');
const { toAPIUser, toAPIOrder } = require('../utils/serializers');
const { normalizePhone, formatPhoneDisplay } = require('../utils/phone');
const { CASHBACK_RATE } = require('../config/loyalty');

function jsonUserByPhone(phoneNorm) {
  return jsonStore.loadUsers().find((u) => normalizePhone(u.phone || '') === phoneNorm) || null;
}

function jsonUserByLegacyId(legacyId) {
  return jsonStore.loadUsers().find((u) => u.id === legacyId) || null;
}

async function findByEmail(email) {
  if (isJson()) {
    return jsonStore.loadUsers().find((u) => u.email === email.toLowerCase()) || null;
  }
  return User.findOne({ email: email.toLowerCase() }).select('+passHash +salt');
}

async function findByLegacyId(legacyId) {
  if (isJson()) {
    return jsonUserByLegacyId(legacyId);
  }
  return User.findOne({ legacyId });
}

async function findByTelegramId(telegramId) {
  if (isJson()) {
    return jsonStore.loadUsers().find((u) => u.telegramId === String(telegramId)) || null;
  }
  return User.findOne({ telegramId: String(telegramId) });
}

async function findByPhone(phone) {
  const phoneNorm = normalizePhone(phone);
  if (!phoneNorm) return null;
  if (isJson()) {
    return jsonUserByPhone(phoneNorm);
  }
  return User.findOne({ phoneNorm });
}

async function findOrCreateByPhone(phone, name) {
  const phoneNorm = normalizePhone(phone);
  if (!phoneNorm) {
    const err = new Error('Некорректный номер телефона');
    err.statusCode = 400;
    throw err;
  }
  const displayPhone = formatPhoneDisplay(phoneNorm);
  const trimmedName = (name || 'Клиент').trim().slice(0, 80);

  if (isJson()) {
    const users = jsonStore.loadUsers();
    let user = users.find((u) => normalizePhone(u.phone || '') === phoneNorm);
    if (user) {
      if (trimmedName && user.name === 'Клиент') user.name = trimmedName;
      jsonStore.saveUsers(users);
      return user;
    }
    user = {
      id: Date.now(),
      name: trimmedName,
      phone: displayPhone,
      role: 'customer',
      bonusBalance: 0,
      orderHistory: [],
      savedAddresses: [],
      favs: [],
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    jsonStore.saveUsers(users);
    return user;
  }

  let user = await User.findOne({ phoneNorm });
  if (user) {
    if (trimmedName && user.name === 'Клиент') {
      user.name = trimmedName;
      user.phone = displayPhone;
      await user.save();
    }
    return user;
  }
  user = await User.create({
    legacyId: Date.now(),
    name: trimmedName,
    phone: displayPhone,
    phoneNorm,
    role: 'customer',
    bonusBalance: 0,
    orderHistory: [],
    savedAddresses: [],
    favs: [],
  });
  return user;
}

async function deductBonus(userRef, amount) {
  const bonusUsed = Math.floor(Number(amount));
  if (bonusUsed <= 0) return { bonusUsed: 0, user: userRef };

  if (isJson()) {
    const users = jsonStore.loadUsers();
    const user = users.find((u) => u.id === (userRef.id || userRef.legacyId));
    if (!user) {
      const err = new Error('Пользователь не найден');
      err.statusCode = 404;
      throw err;
    }
    if ((user.bonusBalance || 0) < bonusUsed) {
      const err = new Error('Недостаточно бонусов на балансе');
      err.statusCode = 400;
      throw err;
    }
    user.bonusBalance -= bonusUsed;
    jsonStore.saveUsers(users);
    return { bonusUsed, user };
  }

  const userId = userRef._id || userRef.id;
  const updated = await User.findOneAndUpdate(
    { _id: userId, bonusBalance: { $gte: bonusUsed } },
    { $inc: { bonusBalance: -bonusUsed } },
    { new: true }
  );
  if (!updated) {
    const err = new Error('Недостаточно бонусов на балансе');
    err.statusCode = 400;
    throw err;
  }
  return { bonusUsed, user: updated };
}

async function refundBonus(userRef, amount) {
  const bonus = Math.floor(Number(amount));
  if (bonus <= 0 || !userRef) return;
  if (isJson()) {
    const users = jsonStore.loadUsers();
    const user = users.find((u) => u.id === (userRef.id || userRef.legacyId));
    if (!user) return;
    user.bonusBalance = (user.bonusBalance || 0) + bonus;
    jsonStore.saveUsers(users);
    return;
  }
  const userId = userRef._id || userRef.id;
  await User.findByIdAndUpdate(userId, { $inc: { bonusBalance: bonus } });
}

async function applyLoyaltyAfterOrder(userRef, orderRef, paidTotal) {
  const bonusEarned = Math.floor(paidTotal * CASHBACK_RATE);
  const orderId = orderRef.id || orderRef.orderNumber;
  const orderMongoId = orderRef._id;

  if (isJson()) {
    const users = jsonStore.loadUsers();
    const user = users.find((u) => u.id === (userRef.id || userRef.legacyId));
    if (!user) return { bonusEarned, bonusBalance: 0 };
    user.bonusBalance = (user.bonusBalance || 0) + bonusEarned;
    user.orderHistory = user.orderHistory || [];
    if (!user.orderHistory.includes(orderId)) {
      user.orderHistory.unshift(orderId);
      if (user.orderHistory.length > 50) user.orderHistory.pop();
    }
    jsonStore.saveUsers(users);
    return { bonusEarned, bonusBalance: user.bonusBalance };
  }

  const userId = userRef._id || userRef.id;
  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $inc: { bonusBalance: bonusEarned },
      $push: { orderHistory: { $each: [orderMongoId], $position: 0, $slice: 50 } },
    },
    { new: true }
  );
  return { bonusEarned, bonusBalance: updated?.bonusBalance ?? 0 };
}

function mergeOrdersLists(primary, secondary) {
  const seen = new Set();
  const out = [];
  for (const o of [...primary, ...secondary]) {
    const key = String(o?.id ?? o?.orderNumber ?? '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 50);
}

async function fetchOrdersByPhone(phone) {
  const phoneNorm = normalizePhone(phone);
  if (!phoneNorm) return [];

  if (isJson()) {
    const state = jsonStore.loadOrdersState();
    return state.orders
      .filter((o) => normalizePhone(o.phone || '') === phoneNorm)
      .slice(0, 50)
      .map((o) => toAPIOrder(o))
      .filter(Boolean);
  }

  const displayPhone = formatPhoneDisplay(phoneNorm);
  const docs = await Order.find({
    $or: [{ phone: displayPhone }, { phone: phone }, { phone: { $regex: phoneNorm.slice(-9) + '$' } }],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return docs.map((o) => toAPIOrder(o)).filter(Boolean);
}

async function resolveOrderHistoryEntries(user) {
  const history = user.orderHistory || [];
  if (!history.length) return [];

  if (isJson()) {
    const state = jsonStore.loadOrdersState();
    return history
      .map((id) => state.orders.find((o) => o.id === id))
      .filter(Boolean)
      .map((o) => toAPIOrder(o));
  }

  const populated = await User.findById(user._id)
    .populate({
      path: 'orderHistory',
      select: 'orderNumber items total status createdAt bonusUsed bonusEarned promo address payment',
    })
    .lean();
  return (populated?.orderHistory || []).map((o) => toAPIOrder(o)).filter(Boolean);
}

async function getLoyaltyProfile({ phone, legacyId }) {
  let user = null;
  if (legacyId) user = await findByLegacyId(legacyId);
  if (!user && phone) user = await findByPhone(phone);
  if (!user) {
    const err = new Error('Пользователь не найден');
    err.statusCode = 404;
    throw err;
  }

  let orders = await resolveOrderHistoryEntries(user);
  if (user.phone) {
    const byPhone = await fetchOrdersByPhone(user.phone);
    orders = mergeOrdersLists(orders, byPhone);
  }
  const apiUser = toAPIUser(user);
  return {
    ...apiUser,
    bonusBalance: user.bonusBalance || 0,
    orderHistory: orders,
  };
}

function isGuestPhoneUser(user) {
  return user && !user.email && !user.passHash;
}

async function register(data) {
  const email = data.email.toLowerCase();
  const phoneNorm = normalizePhone(data.phone);
  const displayPhone = phoneNorm ? formatPhoneDisplay(phoneNorm) : data.phone;
  const { hash, salt } = hashPass(data.password);

  if (isJson()) {
    const users = jsonStore.loadUsers();
    if (users.find((u) => u.email === email)) {
      const err = new Error('Этот email уже зарегистрирован');
      err.statusCode = 409;
      throw err;
    }
    const phoneUser = phoneNorm
      ? users.find((u) => normalizePhone(u.phone || '') === phoneNorm)
      : null;
    if (phoneUser) {
      if (!isGuestPhoneUser(phoneUser)) {
        const err = new Error('Этот телефон уже зарегистрирован');
        err.statusCode = 409;
        throw err;
      }
      phoneUser.name = data.name;
      phoneUser.email = email;
      phoneUser.phone = displayPhone;
      phoneUser.passHash = hash;
      phoneUser.salt = salt;
      jsonStore.saveUsers(users);
      return toAPIUser(phoneUser);
    }
    const user = {
      id: Date.now(),
      name: data.name,
      email,
      phone: displayPhone,
      passHash: hash,
      salt,
      role: 'customer',
      bonusBalance: 0,
      orderHistory: [],
      savedAddresses: [],
      favs: [],
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    jsonStore.saveUsers(users);
    return toAPIUser(user);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Этот email уже зарегистрирован');
    err.statusCode = 409;
    throw err;
  }
  if (phoneNorm) {
    const phoneTaken = await User.findOne({ phoneNorm });
    if (phoneTaken) {
      if (!isGuestPhoneUser(phoneTaken)) {
        const err = new Error('Этот телефон уже зарегистрирован');
        err.statusCode = 409;
        throw err;
      }
      phoneTaken.name = data.name;
      phoneTaken.email = email;
      phoneTaken.phone = displayPhone;
      phoneTaken.phoneNorm = phoneNorm;
      phoneTaken.passHash = hash;
      phoneTaken.salt = salt;
      await phoneTaken.save();
      return toAPIUser(phoneTaken);
    }
  }
  const user = await User.create({
    legacyId: Date.now(),
    name: data.name,
    email,
    phone: displayPhone,
    phoneNorm: phoneNorm || undefined,
    passHash: hash,
    salt,
    role: 'customer',
    bonusBalance: 0,
    orderHistory: [],
    savedAddresses: [],
    favs: [],
  });
  return toAPIUser(user);
}

async function login(email, password) {
  const user = await findByEmail(email);
  if (!user || !checkPass(password, user.passHash, user.salt)) {
    const err = new Error('Неверный email или пароль');
    err.statusCode = 401;
    throw err;
  }
  return toAPIUser(user);
}

async function getProfile(legacyId) {
  const profile = await getLoyaltyProfile({ legacyId });
  return profile;
}

async function saveAddress(legacyId, address) {
  if (isJson()) {
    const users = jsonStore.loadUsers();
    const user = users.find((u) => u.id === legacyId);
    if (!user) {
      const err = new Error('Пользователь не найден');
      err.statusCode = 404;
      throw err;
    }
    if (!user.savedAddresses.includes(address)) {
      user.savedAddresses.unshift(address);
      if (user.savedAddresses.length > 5) user.savedAddresses.pop();
      jsonStore.saveUsers(users);
    }
    return user.savedAddresses;
  }
  const user = await findByLegacyId(legacyId);
  if (!user) {
    const err = new Error('Пользователь не найден');
    err.statusCode = 404;
    throw err;
  }
  if (!user.savedAddresses.includes(address)) {
    user.savedAddresses.unshift(address);
    if (user.savedAddresses.length > 5) user.savedAddresses.pop();
    await user.save();
  }
  return user.savedAddresses;
}

module.exports = {
  findByEmail,
  findByLegacyId,
  findByTelegramId,
  findByPhone,
  findOrCreateByPhone,
  deductBonus,
  refundBonus,
  applyLoyaltyAfterOrder,
  getLoyaltyProfile,
  register,
  login,
  getProfile,
  saveAddress,
};
