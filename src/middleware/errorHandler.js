function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  console.error(err);
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Ошибка сервера';
  if (err.code === 11000) {
    return res.status(409).json({ ok: false, error: 'Запись уже существует' });
  }
  res.status(status).json({ ok: false, success: false, error: message });
}

module.exports = { errorHandler };
