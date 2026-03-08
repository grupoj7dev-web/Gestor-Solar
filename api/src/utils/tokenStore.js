const fs = require('fs');
const path = require('path');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readToken(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    return json;
  } catch (e) {
    return null;
  }
}

function writeToken(filePath, tokenObj) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(tokenObj, null, 2));
}

function isExpired(tokenObj) {
  if (!tokenObj || !tokenObj.expiresAt) return true;
  const now = Date.now();
  return now >= tokenObj.expiresAt;
}

module.exports = { readToken, writeToken, isExpired };

