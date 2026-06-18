const promoService = require('../services/promoService');

async function check(req, res) {
  const code = (req.body.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ ok: false, error: 'Введите промокод' });
  const promo = await promoService.findActivePromo(code);
  if (!promo) return res.status(404).json({ ok: false, error: 'Промокод не найден или истёк' });
  res.json({ ok: true, promo: { code: promo.code, type: promo.type, value: promo.value, label: promo.label } });
}

async function list(req, res) {
  const promos = await promoService.listPromos();
  res.json({ ok: true, promos });
}

async function create(req, res) {
  const code = (req.body.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code || code.length < 3) return res.status(400).json({ ok: false, error: 'Код минимум 3 символа (A-Z, 0-9)' });
  const type = ['percent', 'fixed'].includes(req.body.type) ? req.body.type : 'percent';
  const value = Number(req.body.value);
  if (!value || value <= 0) return res.status(400).json({ ok: false, error: 'Укажите значение скидки' });
  if (type === 'percent' && value > 80) return res.status(400).json({ ok: false, error: 'Максимальная скидка 80%' });
  const label = type === 'percent' ? `−${value}% на заказ` : `−${value.toLocaleString('ru-RU')} сум`;
  try {
    await promoService.createPromo({ code, type, value, label, usageLimit: Number(req.body.usageLimit) || 0 });
    const promos = await promoService.listPromos();
    res.status(201).json({ ok: true, promos });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
}

async function toggle(req, res) {
  const code = (req.body.code || '').trim().toUpperCase();
  try {
    const promos = await promoService.togglePromo(code);
    res.json({ ok: true, promos });
  } catch (e) {
    res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
}

module.exports = { check, list, create, toggle };
