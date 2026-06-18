const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function loadEnv() {
  try {
    require('dotenv').config({ path: path.join(ROOT, '.env') });
  } catch {}
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
}

loadEnv();

module.exports = {
  ROOT,
  PORT: Number(process.env.PORT) || 3000,
  MONGO_URI: process.env.MONGO_URI || '',
  STORAGE: process.env.STORAGE || 'json',
  BOT_TOKEN: process.env.BOT_TOKEN,
  CHAT_ID: process.env.CHAT_ID,
  JWT_SECRET: process.env.JWT_SECRET,
  STAFF_PASSWORD: process.env.STAFF_PASSWORD || 'pizza2026admin',
  STAFF_OWNER_PASSWORD: process.env.STAFF_OWNER_PASSWORD || process.env.STAFF_PASSWORD || 'pizza2026admin',
};
