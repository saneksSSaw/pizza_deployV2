const userService = require('../services/userService');
const { signJWT } = require('../utils/jwt');
const { validateEmail, validatePhone } = require('../utils/validation');

async function register(req, res) {
  const name = (req.body.name || '').trim().slice(0, 80);
  const email = (req.body.email || '').trim().toLowerCase();
  const phone = (req.body.phone || '').trim();
  const pass = (req.body.password || '').trim();
  if (!name || name.length < 2) return res.status(400).json({ ok: false, error: 'Введите имя (минимум 2 символа)' });
  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ ok: false, error: emailErr });
  const phoneErr = validatePhone(phone);
  if (phoneErr) return res.status(400).json({ ok: false, error: phoneErr });
  if (!pass || pass.length < 6) return res.status(400).json({ ok: false, error: 'Пароль минимум 6 символов' });
  const created = await userService.register({ name, email, phone, password: pass });
  const user = await userService.getLoyaltyProfile({ legacyId: created.id });
  const token = signJWT({ id: user.id, email: user.email, role: user.role });
  res.status(201).json({ ok: true, token, user });
}

async function login(req, res) {
  const email = (req.body.email || '').trim().toLowerCase();
  const pass = (req.body.password || '').trim();
  if (!email || !pass) return res.status(400).json({ ok: false, error: 'Введите email и пароль' });
  try {
    const loggedIn = await userService.login(email, pass);
    const user = await userService.getLoyaltyProfile({ legacyId: loggedIn.id });
    const token = signJWT({ id: user.id, email: user.email, role: user.role });
    res.json({ ok: true, token, user });
  } catch (err) {
    res.status(err.statusCode || 401).json({ ok: false, error: err.message });
  }
}

async function me(req, res) {
  const user = await userService.getProfile(req.auth.id);
  res.json({ ok: true, user });
}

async function saveAddress(req, res) {
  const addr = (req.body.address || '').trim().slice(0, 200);
  if (!addr) return res.status(400).json({ ok: false, error: 'Адрес пустой' });
  const savedAddresses = await userService.saveAddress(req.auth.id, addr);
  res.json({ ok: true, savedAddresses });
}

module.exports = { register, login, me, saveAddress };
