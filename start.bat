@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  =============================================
echo   Pizza Makers - Запуск сервера
echo  =============================================
echo.
if not exist node_modules (
  echo  Устанавливаем зависимости...
  call npm install
  echo.
)
if not exist .env (
  if exist .env.example (
    echo  Создаём .env из .env.example...
    copy .env.example .env >nul
  )
)
node server.js
echo.
pause
