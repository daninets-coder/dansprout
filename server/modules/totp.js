// Authenticator-app codes (RFC 6238: 6 digits, 30 seconds, SHA-1), the same kind Google Authenticator and Authy use.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;

export function newSecret() {
  const bytes = randomBytes(20);
  let bits = 0, value = 0, out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
    value &= (1 << bits) - 1;
  }
  return out;
}

function decode(secret) {
  let bits = 0, value = 0;
  const out = [];
  for (const ch of String(secret).toUpperCase().replace(/[^A-Z2-7]/g, '')) {
    value = (value << 5) | ALPHABET.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; value &= (1 << bits) - 1; }
  }
  return Buffer.from(out);
}

export function codeAt(secret, step) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', decode(secret)).update(counter).digest();
  const offset = hmac[19] & 15;
  const number = ((hmac[offset] & 127) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(number % 1e6).padStart(6, '0');
}

// Returns the matching time step (so the caller can refuse to accept the same code twice) or null.
export function verifyCode(secret, code, { now = Date.now(), window = 1 } = {}) {
  const clean = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const current = Math.floor(now / 1000 / STEP_SECONDS);
  for (let drift = -window; drift <= window; drift++) {
    if (timingSafeEqual(Buffer.from(codeAt(secret, current + drift)), Buffer.from(clean))) return current + drift;
  }
  return null;
}

export const otpauthUrl = (secret, email) =>
  `otpauth://totp/${encodeURIComponent('DanSprout Stories admin')}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent('DanSprout Stories admin')}&digits=6&period=30`;
