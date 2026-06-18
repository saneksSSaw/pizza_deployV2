# Pizza Makers 🍕

## Деплой на Render.com (бесплатно)

1. Зайди на https://render.com и зарегистрируйся
2. Нажми **New → Web Service**
3. Загрузи код через GitHub или выбери **Deploy manually**
4. Настройки:
   - **Build Command:** (оставь пустым)
   - **Start Command:** `node server.js`
   - **Environment:** Node
5. В разделе **Environment Variables** добавь:
   - `BOT_TOKEN` = твой токен бота
   - `CHAT_ID` = твой Chat ID
6. Нажми **Deploy** — получишь ссылку вида `https://pizza-makers.onrender.com`

## Локальный запуск

1. Переименуй `.env.example` в `.env` и заполни токены
2. Запусти `start.bat` (Windows) или `node server.js`
3. Открой http://localhost:3000
