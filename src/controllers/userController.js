const userService = require('../services/userService');
const { validatePhone } = require('../utils/validation');

async function getProfile(req, res) {
  const phone = (req.query.phone || '').trim();
  if (req.auth?.id) {
    const user = await userService.getLoyaltyProfile({ legacyId: req.auth.id });
    return res.json({ ok: true, user });
  }
  if (!phone) {
    return res.status(400).json({ ok: false, error: 'Укажите телефон или войдите в аккаунт' });
  }
  const phoneErr = validatePhone(phone);
  if (phoneErr) return res.status(400).json({ ok: false, error: phoneErr });
  try {
    const user = await userService.getLoyaltyProfile({
      phone: phone || undefined,
      legacyId: req.auth?.id || undefined,
    });
    res.json({ ok: true, user });
  } catch (err) {
    if (err.statusCode === 404 && phone) {
      return res.json({
        ok: true,
        user: { phone, bonusBalance: 0, orderHistory: [], name: null },
      });
    }
    res.status(err.statusCode || 404).json({ ok: false, error: err.message });
  }
}

async function getBalance(req, res) {
  const phone = (req.query.phone || req.body?.phone || '').trim();
  if (!phone) return res.status(400).json({ ok: false, error: 'Укажите телефон' });
  const phoneErr = validatePhone(phone);
  if (phoneErr) return res.status(400).json({ ok: false, error: phoneErr });
  try {
    const user = await userService.getLoyaltyProfile({ phone });
    res.json({ ok: true, bonusBalance: user.bonusBalance, name: user.name });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.json({ ok: true, bonusBalance: 0, name: null });
    }
    res.status(err.statusCode || 400).json({ ok: false, error: err.message });
  }
}

module.exports = { getProfile, getBalance };
