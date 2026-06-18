function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  const core = digits.startsWith('998') ? digits.slice(3) : digits;
  if (core.length !== 9) return '';
  return `+998${core}`;
}

function formatPhoneDisplay(norm) {
  if (!norm || norm.length !== 13) return norm;
  return `+998 ${norm.slice(4, 6)} ${norm.slice(6, 9)} ${norm.slice(9, 11)} ${norm.slice(11, 13)}`;
}

module.exports = { normalizePhone, formatPhoneDisplay };
