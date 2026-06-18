const { verifyJWT } = require('../utils/jwt');

function getTokenFromReq(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/pm_(?:staff_)?token=([^;]+)/);
  return m ? m[1] : null;
}

function optionalAuth(req, res, next) {
  const token = getTokenFromReq(req);
  if (token) {
    const payload = verifyJWT(token);
    if (payload) req.auth = payload;
  }
  next();
}

function requireAuth(req, res, next) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ ok: false, error: 'Не авторизован' });
  const payload = verifyJWT(token);
  if (!payload) return res.status(401).json({ ok: false, error: 'Сессия истекла, войдите снова' });
  req.auth = payload;
  next();
}

function requireStaff(req, res, next) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ ok: false, error: 'Требуется авторизация персонала' });
  const payload = verifyJWT(token);
  if (!payload?.staffAccess) return res.status(401).json({ ok: false, error: 'Требуется авторизация персонала' });
  req.auth = payload;
  next();
}

function requireOwner(req, res, next) {
  requireStaff(req, res, () => {
    if (req.auth.role !== 'owner') {
      return res.status(403).json({ ok: false, error: 'Только для владельца' });
    }
    next();
  });
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  getTokenFromReq,
  optionalAuth,
  requireAuth,
  requireStaff,
  requireOwner,
  asyncHandler,
};
