const orderService = require('../services/orderService');
const { validateOrder } = require('../utils/validation');
const { formatOrderMessage, sendToTelegram } = require('../utils/telegram');

async function create(req, res) {
  const err = validateOrder(req.body);
  if (err) return res.status(400).json({ ok: false, success: false, error: err });

  try {
    const order = await orderService.createOrder(req.body, {
      legacyId: req.auth?.id || null,
    });
    console.log(`\n  >>> ЗАКАЗ #${order.id}: ${order.name}, ${order.total} сум`);
    if (order.bonusUsed) console.log(`      Бонусы: −${order.bonusUsed}, кэшбэк: +${order.bonusEarned}`);
    const tg = await sendToTelegram(formatOrderMessage(order));
    if (!tg.ok) console.error('  Telegram ошибка:', tg.description || tg.error);
    else console.log('  >>> Telegram: отправлено OK');
    res.json({
      ok: true,
      success: true,
      orderId: order.id,
      bonusUsed: order.bonusUsed || 0,
      bonusEarned: order.bonusEarned || 0,
      bonusBalance: order.bonusBalance ?? null,
      total: order.total,
      telegram: !!tg.ok,
      telegramError: tg.ok ? null : tg.description || tg.error,
    });
  } catch (e) {
    res.status(e.statusCode || 400).json({ ok: false, success: false, error: e.message });
  }
}

async function testOrder(req, res) {
  req.body = {
    name: 'Тестовый клиент',
    phone: '+998 90 123 45 67',
    address: 'Сергели, тестовый заказ',
    items: [{ name: 'Пепперони', size: 30, qty: 1, price: 57000 }],
    subtotal: 57000,
    deliveryFee: 15000,
    deliveryLabel: 'По Сергели',
    deliveryZone: 'sergeli',
    total: 72000,
    payment: 'cash',
  };
  return create(req, res);
}

async function getAll(req, res) {
  const orders = await orderService.getAllOrders();
  res.json({ ok: true, orders });
}

async function updateStatus(req, res) {
  const id = parseInt(req.params.id, 10);
  const order = await orderService.updateOrderStatus(id, req.body.status);
  res.json({ ok: true, id: order.id, status: order.status });
}

async function statusCheck(req, res) {
  const id = parseInt(req.params.id, 10);
  const order = await orderService.getOrderByNumber(id);
  if (!order) return res.status(404).json({ ok: false, error: 'Заказ не найден' });
  res.json({ ok: true, id: order.id, status: order.status, updatedAt: order.statusUpdatedAt || order.createdAt });
}

module.exports = { create, testOrder, getAll, updateStatus, statusCheck };
