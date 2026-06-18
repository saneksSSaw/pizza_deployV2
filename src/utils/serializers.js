function toAPIOrder(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const num = o.orderNumber ?? o.id;
  return {
    id: num,
    orderNumber: num,
    name: o.name,
    phone: o.phone,
    address: o.address,
    note: o.note || '',
    items: o.items || [],
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    deliveryLabel: o.deliveryLabel,
    deliveryZone: o.deliveryZone,
    district: o.district,
    promo: o.promo,
    promoDiscount: o.promoDiscount,
    totalBeforeBonus: o.totalBeforeBonus ?? o.total,
    bonusUsed: o.bonusUsed || 0,
    bonusEarned: o.bonusEarned || 0,
    total: o.total,
    payment: o.payment,
    status: o.status,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    statusUpdatedAt: o.statusUpdatedAt instanceof Date ? o.statusUpdatedAt.toISOString() : o.statusUpdatedAt,
  };
}

function toAPIUser(doc) {
  if (!doc) return null;
  const u = doc.toObject ? doc.toObject({ virtuals: false }) : doc;
  return {
    id: u.legacyId || u.id || u._id?.toString(),
    legacyId: u.legacyId,
    telegramId: u.telegramId,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    bonusBalance: u.bonusBalance || 0,
    orderHistory: u.orderHistory || [],
    savedAddresses: u.savedAddresses || [],
    favs: u.favs || [],
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
  };
}

function toAPIMenuItem(doc) {
  if (!doc) return null;
  const m = doc.toObject ? doc.toObject() : doc;
  return {
    id: m.legacyId || m.slug,
    slug: m.slug,
    name: m.name,
    desc: m.description,
    description: m.description,
    price: m.prices,
    prices: m.prices,
    img: m.image,
    image: m.image,
    category: m.category,
    categories: m.categories,
    badge: m.badge,
    badgeColor: m.badgeColor,
    active: m.active,
    sortOrder: m.sortOrder,
  };
}

function toAPIPromo(doc) {
  if (!doc) return null;
  const p = doc.toObject ? doc.toObject() : doc;
  return {
    code: p.code,
    type: p.type,
    value: p.value,
    label: p.label,
    active: p.active,
    usageLimit: p.usageLimit,
    usedCount: p.usedCount,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

module.exports = { toAPIOrder, toAPIUser, toAPIMenuItem, toAPIPromo };
