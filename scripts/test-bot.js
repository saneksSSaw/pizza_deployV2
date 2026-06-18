/**
 * Проверка бота: node scripts/test-bot.js
 * Читает BOT_TOKEN и CHAT_ID из .env — токен не нужно вводить вручную.
 */
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  });
}

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;

async function main() {
  console.log('=== Pizza Makers — проверка Telegram-бота ===\n');

  if (!token) {
    console.error('❌ BOT_TOKEN не найден. Создайте файл .env в корне проекта.');
    process.exit(1);
  }
  if (!chatId) {
    console.error('❌ CHAT_ID не найден в .env');
    process.exit(1);
  }

  console.log('1. Проверяем токен (getMe)...');
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const me = await meRes.json();
  if (!me.ok) {
    console.error('❌ Токен недействителен:', me.description);
    console.error('   → Откройте @BotFather → /mybots → выберите бота → API Token → Revoke и вставьте новый в .env');
    process.exit(1);
  }
  console.log(`   ✅ Бот: @${me.result.username} (${me.result.first_name})`);

  console.log('\n2. Отправляем тестовое сообщение в чат', chatId, '...');
  const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: '🍕 Тест Pizza Makers — если вы видите это, бот работает!',
    }),
  });
  const msg = await msgRes.json();
  if (!msg.ok) {
    console.error('❌ Сообщение не отправлено:', msg.description);
    if (msg.description?.includes('chat not found')) {
      console.error('   → Бот не добавлен в группу или CHAT_ID неверный.');
      console.error('   → Добавьте бота в группу кассиров и напишите в группе /start');
    }
    if (msg.description?.includes('bot was blocked')) {
      console.error('   → Разблокируйте бота или добавьте снова в группу.');
    }
    process.exit(1);
  }
  console.log('   ✅ Сообщение доставлено! Проверьте Telegram-группу.\n');
  console.log('Тест бота = OK. Dlya zakazov zapustite start.bat (ne test-bot.bat!)');
  console.log('Sajt: http://localhost:3000/indx.html');
  console.log('Kassa: http://localhost:3000/staff');
}

main().catch(e => { console.error('Ошибка сети:', e.message); process.exit(1); });
