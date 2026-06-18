const { STAFF_PASSWORD, STAFF_OWNER_PASSWORD, BOT_TOKEN, PORT } = require('../config/env');
const { signJWT } = require('../utils/jwt');
const orderService = require('../services/orderService');

async function login(req, res) {
  const pass = (req.body.password || '').trim();
  let role = null;
  if (pass === STAFF_OWNER_PASSWORD) role = 'owner';
  else if (pass === STAFF_PASSWORD) role = 'staff';
  else return res.status(401).json({ ok: false, error: 'Неверный пароль' });
  const token = signJWT({ role, staffAccess: true }, 24);
  res.json({ ok: true, token, role });
}

function check(req, res) {
  res.json({ ok: true, role: req.auth.role || 'staff' });
}

function health(req, res) {
  res.json({ ok: true, port: PORT, bot: !!BOT_TOKEN, db: true });
}

async function analytics(req, res) {
  const period = req.query.period === 'month' ? 'month' : 'week';
  const analytics = await orderService.computeAnalytics(period);
  res.json({ ok: true, analytics });
}

module.exports = { login, check, health, analytics };
