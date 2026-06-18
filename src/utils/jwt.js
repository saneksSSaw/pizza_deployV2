const crypto = require('crypto');
const env = require('../config/env');

const secret = env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signJWT(payload, expiresInHours = 168) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const body = b64url(JSON.stringify({ ...payload, exp }));
  const sig = b64url(crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token) {
  try {
    const [h, b, s] = token.split('.');
    const expected = b64url(crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest());
    if (s !== expected) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashPass(pass, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(pass).digest('hex');
  return { hash, salt };
}

function checkPass(pass, storedHash, salt) {
  const { hash } = hashPass(pass, salt);
  return hash === storedHash;
}

module.exports = { signJWT, verifyJWT, hashPass, checkPass };
