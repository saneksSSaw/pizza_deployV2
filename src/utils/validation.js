const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const UZ_RE = /^\+998[\s-]?(?:9[0-9]|6[125689]|7[012345789]|8[1256])[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;

function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email обязателен';
  const e = email.trim().toLowerCase();
  if (e.length < 5 || e.length > 100) return 'Некорректный email';
  if (!EMAIL_RE.test(e)) return 'Введите корректный email (например: name@mail.com)';
  return null;
}

function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return 'Телефон обязателен';
  const p = phone.trim();
  if (!UZ_RE.test(p)) return 'Введите номер в формате +998 XX XXX XX XX';
  return null;
}

function validateOrder(body) {
  if (!body || typeof body !== 'object') return 'Некорректные данные заказа';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 24) : '';
  const address = typeof body.address === 'string' ? body.address.trim().slice(0, 300) : '';
  if (!name || name.length < 2) return 'Введите имя';
  const phoneErr = validatePhone(phone);
  if (phoneErr) return phoneErr;
  if (!address || address.length < 5) return 'Укажите адрес доставки';
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) return 'Корзина пуста';
  for (const it of items) {
    if (!it || typeof it !== 'object') return 'Некорректный товар в заказе';
    const itemName = typeof it.name === 'string' ? it.name.trim() : '';
    if (!itemName) return 'Некорректное название товара';
    const qty = Number(it.qty);
    const price = Number(it.price);
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) return 'Некорректное количество';
    if (!Number.isFinite(price) || price < 0 || price > 50000000) return 'Некорректная цена';
  }
  const total = Number(body.total);
  if (!Number.isFinite(total) || total < 50000) return 'Минимальная сумма заказа — 50 000 сум';
  return null;
}

module.exports = { validateEmail, validatePhone, validateOrder };
