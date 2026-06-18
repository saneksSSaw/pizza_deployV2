const fs = require('fs');
const path = require('path');
const { ROOT } = require('../config/env');

const DATA_DIR = path.join(ROOT, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROMOS_FILE = path.join(DATA_DIR, 'promos.json');

const DEFAULT_PROMOS = [
  { code: 'PIZZA10', type: 'percent', value: 10, label: '−10% на заказ', active: true, usageLimit: 0, usedCount: 0 },
  { code: 'SERGELI', type: 'fixed', value: 15000, label: '−15 000 сум', active: true, usageLimit: 0, usedCount: 0 },
  { code: 'MAKERS', type: 'percent', value: 15, label: '−15% на заказ', active: true, usageLimit: 100, usedCount: 0 },
  { code: 'PIZZA2026', type: 'percent', value: 20, label: '−20% (акция 2026)', active: true, usageLimit: 50, usedCount: 0 },
];

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadOrdersState() {
  const data = readJson(ORDERS_FILE, { counter: 1, orders: [] });
  return { counter: data.counter || 1, orders: data.orders || [] };
}

function saveOrdersState(state) {
  writeJson(ORDERS_FILE, state);
}

function loadUsers() {
  return readJson(USERS_FILE, []);
}

function saveUsers(users) {
  writeJson(USERS_FILE, users);
}

function loadPromos() {
  const promos = readJson(PROMOS_FILE, null);
  if (!promos) {
    writeJson(PROMOS_FILE, DEFAULT_PROMOS);
    return DEFAULT_PROMOS;
  }
  return promos;
}

function savePromos(promos) {
  writeJson(PROMOS_FILE, promos);
}

module.exports = {
  loadOrdersState,
  saveOrdersState,
  loadUsers,
  saveUsers,
  loadPromos,
  savePromos,
};
