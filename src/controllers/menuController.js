const menuService = require('../services/menuService');

async function list(req, res) {
  const category = req.query.category || null;
  const items = await menuService.listMenu(category);
  res.json({ ok: true, items });
}

async function getOne(req, res) {
  const item = await menuService.getBySlug(req.params.slug);
  if (!item) return res.status(404).json({ ok: false, error: 'Позиция не найдена' });
  res.json({ ok: true, item });
}

module.exports = { list, getOne };
