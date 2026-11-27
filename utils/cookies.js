// Tiny cookie parser (cookie-parser is not on the allowed library list)
function parseCookies(header = '') {
  if (typeof header !== 'string') return {};
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try { acc[key] = decodeURIComponent(val); } catch { acc[key] = val; }
    }
    return acc;
  }, {});
}

module.exports = { parseCookies };
