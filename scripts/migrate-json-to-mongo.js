require('../src/config/env');
const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../src/config/db');
const { ROOT } = require('../src/config/env');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Promo = require('../src/models/Promo');
const Counter = require('../src/models/Counter');

const DATA_DIR = path.join(ROOT, 'data');

function readJson(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function migrate() {
  await connectDB();
  let imported = { users: 0, orders: 0, promos: 0 };

  const users = readJson('users.json');
  if (Array.isArray(users)) {
    for (const u of users) {
      const exists = await User.findOne({ $or: [{ legacyId: u.id }, { email: u.email }] });
      if (exists) continue;
      await User.create({
        legacyId: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        passHash: u.passHash,
        salt: u.salt,
        role: u.role || 'customer',
        bonusBalance: u.bonusBalance || 0,
        orderHistory: u.orderHistory || [],
        savedAddresses: u.savedAddresses || [],
        favs: u.favs || [],
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      });
      imported.users++;
    }
  }

  const promos = readJson('promos.json');
  if (Array.isArray(promos)) {
    for (const p of promos) {
      const exists = await Promo.findOne({ code: p.code });
      if (exists) continue;
      await Promo.create({
        code: p.code,
        type: p.type,
        value: p.value,
        label: p.label,
        active: p.active !== false,
        usageLimit: p.usageLimit || 0,
        usedCount: p.usedCount || 0,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      });
      imported.promos++;
    }
  }

  const ordersData = readJson('orders.json');
  const orders = ordersData?.orders || [];
  let maxOrderNum = ordersData?.counter ? ordersData.counter - 1 : 0;
  for (const o of orders) {
    const exists = await Order.findOne({ orderNumber: o.id });
    if (exists) continue;
    if (o.id > maxOrderNum) maxOrderNum = o.id;
    await Order.create({
      orderNumber: o.id,
      name: o.name,
      phone: o.phone,
      address: o.address,
      note: o.note || '',
      items: o.items || [],
      subtotal: o.subtotal || 0,
      deliveryFee: o.deliveryFee || 0,
      deliveryLabel: o.deliveryLabel || '',
      deliveryZone: o.deliveryZone || '',
      district: o.district || '',
      promo: o.promo || null,
      promoDiscount: o.promoDiscount || 0,
      total: o.total || 0,
      payment: o.payment || 'cash',
      status: o.status || 'new',
      statusUpdatedAt: o.statusUpdatedAt ? new Date(o.statusUpdatedAt) : new Date(o.createdAt),
      createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
    });
    imported.orders++;
  }
  if (maxOrderNum > 0) await Counter.setIfGreater('orders', maxOrderNum);

  console.log('Migration complete:', imported);
  await disconnectDB();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
