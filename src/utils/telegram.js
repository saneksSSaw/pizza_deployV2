const fs = require('fs');
const path = require('path');
const { BOT_TOKEN, CHAT_ID, ROOT } = require('../config/env');

const DATA_DIR = path.join(ROOT, 'data');

function formatOrderMessage(order) {
  const {
    id,
    name,
    phone,
    address,
    note,
    items,
    subtotal,
    deliveryFee,
    total,
    payment,
    deliveryLabel,
    deliveryZone,
    district,
    promo,
    promoDiscount,
    bonusUsed,
    bonusEarned,
    totalBeforeBonus,
  } = order;
  const lines = items.map((x) => {
    let line = `• ${x.name}${x.size ? ' ' + x.size + 'см' : ''} × ${x.qty} = ${(x.price * x.qty).toLocaleString('ru-RU')} сум`;
    if (x.dough) line += `\n  Тесто: ${x.dough}`;
    if (x.toppings?.length) line += `\n  + ${x.toppings.join(', ')}`;
    return line;
  }).join('\n');
  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' });
  let msg = `🍕 НОВЫЙ ЗАКАЗ #${id} — Pizza Makers\n${now}\n\n`;
  msg += `👤 ${name}\n📞 ${phone}\n📍 ${address}\n`;
  if (district) msg += `🏙 Район: ${district}\n`;
  if (note) msg += `💬 ${note}\n`;
  msg += `\n🚗 Доставка: ${deliveryLabel || deliveryZone} (+${deliveryFee?.toLocaleString('ru-RU')} сум)\n`;
  msg += `💳 Оплата: ${payment === 'click' ? 'Click' : payment === 'payme' ? 'Payme' : payment === 'card' ? 'Картой курьеру' : 'Наличные'}\n`;
  if (promo) msg += `🎟 Промокод: ${promo} (−${promoDiscount?.toLocaleString('ru-RU')} сум)\n`;
  if (bonusUsed > 0) msg += `⭐ Списано бонусов: −${bonusUsed?.toLocaleString('ru-RU')} сум\n`;
  msg += `\n${lines}\n\n`;
  msg += `Товары: ${subtotal?.toLocaleString('ru-RU')} сум\n`;
  msg += `Доставка: ${deliveryFee?.toLocaleString('ru-RU')} сум\n`;
  if (totalBeforeBonus && totalBeforeBonus !== total) {
    msg += `До бонусов: ${totalBeforeBonus?.toLocaleString('ru-RU')} сум\n`;
  }
  msg += `ИТОГО: ${total?.toLocaleString('ru-RU')} сум`;
  if (bonusEarned > 0) msg += `\n💎 Кэшбэк клиенту: +${bonusEarned?.toLocaleString('ru-RU')} бонусов (5%)`;
  return msg;
}

function logTelegram(msg) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(path.join(DATA_DIR, 'telegram.log'), `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

async function sendToTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    const err = 'BOT_TOKEN или CHAT_ID не заданы в .env';
    logTelegram('ERROR: ' + err);
    return { ok: false, error: err };
  }
  const body = { chat_id: String(CHAT_ID), text: text.slice(0, 4000) };
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) logTelegram('FAIL: ' + (data.description || JSON.stringify(data)));
  else logTelegram('OK: message sent');
  return data;
}

module.exports = { formatOrderMessage, sendToTelegram, logTelegram };
