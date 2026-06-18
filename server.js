require('./src/config/env');
const fs = require('fs');
const path = require('path');
const { connectDB } = require('./src/config/db');
const { PORT, BOT_TOKEN, STAFF_PASSWORD, ROOT, MONGO_URI, STORAGE } = require('./src/config/env');
const { setStoreMode } = require('./src/lib/storeMode');
const createApp = require('./src/app');
const promoService = require('./src/services/promoService');
const menuService = require('./src/services/menuService');

const DATA_DIR = path.join(ROOT, 'data');
let actualPort = PORT;

function savePort(port) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, 'port.txt'), String(port));
  } catch {}
}

function openBrowser(port) {
  if (process.platform !== 'win32') return;
  const { exec } = require('child_process');
  setTimeout(() => {
    exec(`start "" "http://localhost:${port}/staff"`);
    exec(`start "" "http://localhost:${port}/index.html"`);
  }, 800);
}

async function checkBotOnStart() {
  if (!BOT_TOKEN) return;
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const d = await r.json();
    if (d.ok) console.log(`  Telegram бот: @${d.result.username} ✓`);
    else console.warn('  Telegram ошибка:', d.description);
  } catch {
    console.warn('  Нет доступа к Telegram');
  }
}

function startServer(port) {
  actualPort = port;
  const app = createApp();
  const server = app.listen(port, '0.0.0.0', async () => {
    savePort(port);
    console.log('');
    console.log('  ════════════════════════════════════════');
    console.log('  🍕 Pizza Makers — ЗАПУЩЕН');
    console.log('  ════════════════════════════════════════');
    console.log(`  Сайт:       http://localhost:${port}/`);
    console.log(`  Панель:     http://localhost:${port}/staff`);
    console.log(`  Пароль:     ${STAFF_PASSWORD}`);
    console.log('  НЕ ЗАКРЫВАЙТЕ это окно!');
    console.log('  ════════════════════════════════════════');
    console.log('');
    if (!BOT_TOKEN) console.warn('  ⚠ BOT_TOKEN не задан в .env');
    await checkBotOnStart();
    openBrowser(port);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const next = Number(actualPort) + 1;
      console.warn(`\n  Порт ${actualPort} занят, пробуем ${next}...\n`);
      startServer(next);
      return;
    }
    console.error(err);
    process.exit(1);
  });
}

async function initDatabase() {
  const useMongo = STORAGE === 'mongo' || (STORAGE !== 'json' && MONGO_URI);
  if (!useMongo) {
    setStoreMode('json');
    console.log('  Хранилище: JSON (data/)');
    return;
  }
  try {
    await connectDB();
    setStoreMode('mongo');
    console.log('  Хранилище: MongoDB');
    await promoService.ensureDefaults();
    await menuService.ensureDefaults();
  } catch (err) {
    console.warn('');
    console.warn('  ⚠ MongoDB недоступна:', err.message);
    console.warn('  → Переключаемся на JSON-файлы (папка data/)');
    console.warn('  → Чтобы использовать MongoDB: установите MongoDB и укажите MONGO_URI в .env');
    console.warn('');
    setStoreMode('json');
  }
}

async function bootstrap() {
  try {
    await initDatabase();
    startServer(PORT);
  } catch (err) {
    console.error('  Не удалось запустить сервер:', err.message);
    process.exit(1);
  }
}

bootstrap();
