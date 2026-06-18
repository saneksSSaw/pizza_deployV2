const MenuItem = require('../models/MenuItem');
const { isJson } = require('../lib/storeMode');
const { toAPIMenuItem } = require('../utils/serializers');

const DEFAULT_MENU = [
  { legacyId: 1, slug: 'pepperoni', name: 'Пепперони', description: 'Томатный соус, моцарелла, острая пепперони', category: 'pizza', categories: ['hit', 'meat'], prices: { 25: 45000, 30: 57000, 35: 69000 }, sortOrder: 1 },
  { legacyId: 2, slug: 'margarita', name: 'Маргарита', description: 'Томатный соус, моцарелла, свежий базилик, оливковое масло', category: 'pizza', categories: ['veg'], prices: { 25: 38000, 30: 49000, 35: 59000 }, sortOrder: 2 },
  { legacyId: 3, slug: 'four-cheese', name: 'Четыре сыра', description: 'Моцарелла, чеддер, горгонзола, пармезан, орегано', category: 'pizza', categories: ['hit', 'veg'], prices: { 25: 52000, 30: 64000, 35: 76000 }, sortOrder: 3 },
  { legacyId: 4, slug: 'meat', name: 'Мясная', description: 'Говядина, ветчина, бекон, лук, томаты, моцарелла', category: 'pizza', categories: ['meat'], prices: { 25: 55000, 30: 68000, 35: 82000 }, sortOrder: 4 },
  { legacyId: 5, slug: 'hawaiian', name: 'Гавайская', description: 'Курица, ананас, моцарелла, томатный соус', category: 'pizza', categories: ['meat'], prices: { 25: 47000, 30: 59000, 35: 71000 }, sortOrder: 5 },
  { legacyId: 6, slug: 'vegetable', name: 'Овощная', description: 'Болгарский перец, оливки, шампиньоны, томаты, базилик', category: 'pizza', categories: ['veg'], prices: { 25: 40000, 30: 51000, 35: 62000 }, sortOrder: 6 },
  { legacyId: 7, slug: 'mushroom', name: 'Грибная', description: 'Шампиньоны, моцарелла, чеддер, чеснок, тимьян', category: 'pizza', categories: ['new', 'veg'], prices: { 25: 44000, 30: 55000, 35: 66000 }, sortOrder: 7 },
  { legacyId: 8, slug: 'bbq-chicken', name: 'BBQ Курица', description: 'Курица барбекю, красный лук, соус BBQ, моцарелла', category: 'pizza', categories: ['new', 'meat'], prices: { 25: 50000, 30: 62000, 35: 74000 }, sortOrder: 8 },
  { slug: 'custom', name: 'Собери сам', description: 'Томатный соус, моцарелла и ваши любимые ингредиенты', category: 'pizza', categories: ['custom'], prices: { 25: 32000, 30: 40000, 35: 48000 }, sortOrder: 0 },
];

async function ensureDefaults() {
  if (isJson()) return;
  const count = await MenuItem.countDocuments();
  if (count === 0) {
    await MenuItem.insertMany(DEFAULT_MENU, { ordered: false });
  }
}

async function listMenu(category) {
  if (isJson()) {
    let items = DEFAULT_MENU.filter((m) => m.active !== false);
    if (category) items = items.filter((m) => m.category === category);
    return items.map(toAPIMenuItem);
  }
  await ensureDefaults();
  const filter = { active: true };
  if (category) filter.category = category;
  const docs = await MenuItem.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  return docs.map(toAPIMenuItem);
}

async function getBySlug(slug) {
  if (isJson()) {
    const item = DEFAULT_MENU.find((m) => m.slug === slug);
    return item ? toAPIMenuItem(item) : null;
  }
  const doc = await MenuItem.findOne({ slug, active: true }).lean();
  return doc ? toAPIMenuItem(doc) : null;
}

module.exports = { ensureDefaults, listMenu, getBySlug, DEFAULT_MENU };
