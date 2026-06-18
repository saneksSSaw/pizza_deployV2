const express = require('express');
const path = require('path');
const { verifyJWT } = require('./utils/jwt');
const { ROOT } = require('./config/env');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const promoRoutes = require('./routes/promos');
const staffRoutes = require('./routes/staff');
const menuRoutes = require('./routes/menu');
const userRoutes = require('./routes/users');
const { errorHandler } = require('./middleware/errorHandler');

const STAFF_LOGIN_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Pizza Makers — Вход для персонала</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',sans-serif;background:#0F0F12;color:#e4e1e6;min-height:100vh;display:flex;align-items:center;justify-content:center}
  .card{background:#1a1a1e;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:40px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
  h1{font-size:22px;font-weight:800;background:linear-gradient(135deg,#ffb3af,#ff5f5f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-align:center;margin-bottom:6px}
  .sub{text-align:center;color:#666;font-size:13px;margin-bottom:28px}
  input{width:100%;background:#111;border:1.5px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;color:#e4e1e6;font-size:15px;outline:none;transition:border .2s;margin-bottom:14px}
  input:focus{border-color:#ff5f5f}
  button{width:100%;background:linear-gradient(135deg,#ff5f5f,#ff9f9f);color:#fff;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;transition:opacity .2s}
  button:hover{opacity:.9}
  .err{color:#ff6b6b;font-size:13px;text-align:center;margin-top:12px;min-height:20px}
  .lock{text-align:center;font-size:32px;margin-bottom:16px}
</style>
</head>
<body>
<div class="card">
  <div class="lock">🔐</div>
  <h1>Pizza Makers</h1>
  <p class="sub">Панель для персонала — требуется пароль</p>
  <input type="password" id="pw" placeholder="Пароль персонала" onkeydown="if(event.key==='Enter')login()" autofocus/>
  <button onclick="login()">Войти в панель</button>
  <div class="err" id="err"></div>
</div>
<script>
async function login(){
  const pw=document.getElementById('pw').value.trim();
  if(!pw){document.getElementById('err').textContent='Введите пароль';return;}
  const r=await fetch('/api/staff/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
  const d=await r.json();
  if(d.ok){
    document.cookie='pm_staff_token='+d.token+';path=/;max-age=86400;SameSite=Strict';
    location.reload();
  } else {
    document.getElementById('err').textContent=d.error||'Неверный пароль';
    document.getElementById('pw').value='';
  }
}
</script>
</body>
</html>`;

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', orderRoutes);
  app.use('/api/promo', promoRoutes);
  app.use('/api', staffRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/users', userRoutes);

  app.get(['/staff', '/staff.html'], (req, res, next) => {
    const cookie = req.headers.cookie || '';
    const m = cookie.match(/pm_staff_token=([^;]+)/);
    const token = m ? m[1] : null;
    const payload = token ? verifyJWT(token) : null;
    if (!payload?.staffAccess) {
      res.type('html').send(STAFF_LOGIN_HTML);
      return;
    }
    if (req.path === '/staff') {
      res.redirect('/staff.html');
      return;
    }
    next();
  });

  app.use(express.static(ROOT, { index: 'index.html' }));

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ ok: false, error: 'Not found' });
    }
    if (req.method === 'GET') {
      return res.sendFile(path.join(ROOT, 'index.html'));
    }
    res.status(404).json({ ok: false, error: 'Not found' });
  });

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
