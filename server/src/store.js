import crypto from 'node:crypto';
import { config } from './config.js';

/**
 * Ephemeral stores (never hold passwords or plaintext tokens beyond use):
 * sessions, OTP challenges, single-use tokens, rate/attempt tracking.
 * All of these intentionally reset when the demo server restarts.
 */

export const sessions = new Map(); // tokenHash -> { userId, expiresAt }
export const draftTokens = new Map(); // tokenHash -> applicationId
export const otpChallenges = new Map(); // key -> { codeHash, expiresAt, attempts, sentAt, count }
export const singleUseTokens = new Map(); // kind:tokenHash -> { payload, expiresAt, usedAt }
export const loginAttempts = new Map(); // identifier -> { count, lockedUntil }
export const verifiedMobiles = new Map(); // mobile -> expiry (OTP confirmed for pre-signup users)
// Demo-mode activation tokens, kept in memory only (never persisted),
// invalidated when the activation is consumed.
export const demoActivationTokens = new Map(); // applicationId -> token
export const memory = {
  users: [],
  businesses: [],
  documents: [],
  applications: [],
};

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function newUserId() {
  return `VY-${crypto.randomInt(100000, 999999)}`;
}

export function newRefId() {
  return `VYAPP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function hashToken(token) {
  return sha256(`${config.sessionSecret}:${token}`);
}

/* ------------------------------ sessions -------------------------------- */

export function createSession(userId, remember = false) {
  const token = randomToken();
  const ttl = remember ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  sessions.set(hashToken(token), { userId, expiresAt: Date.now() + ttl });
  return { token, ttl };
}

export function getSession(token) {
  if (!token) return null;
  const record = sessions.get(hashToken(token));
  if (!record) return null;
  if (record.expiresAt < Date.now()) {
    sessions.delete(hashToken(token));
    return null;
  }
  return record;
}

export function destroySession(token) {
  if (token) sessions.delete(hashToken(token));
}

/* -------------------------------- OTP ----------------------------------- */

export function otpKey(mobile, purpose) {
  return `${purpose}:${mobile}`;
}

export function createOtpChallenge(mobile, purpose) {
  const code = String(crypto.randomInt(100000, 999999));
  const key = otpKey(mobile, purpose);
  const previous = otpChallenges.get(key);
  otpChallenges.set(key, {
    codeHash: sha256(code),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    attempts: 0,
    sentAt: Date.now(),
    count: (previous?.count ?? 0) + 1,
    windowStart: previous?.windowStart ?? Date.now(),
    code: config.demoMode ? code : null, // only surfaced in demo mode
  });
  return code;
}

export function verifyOtpChallenge(mobile, purpose, code) {
  const key = otpKey(mobile, purpose);
  const challenge = otpChallenges.get(key);
  if (!challenge) return { ok: false, code: 'otp_expired' };
  if (challenge.expiresAt < Date.now()) {
    otpChallenges.delete(key);
    return { ok: false, code: 'otp_expired' };
  }
  if (challenge.attempts >= 5) {
    otpChallenges.delete(key);
    return { ok: false, code: 'otp_rate_limited' };
  }
  challenge.attempts += 1;
  if (sha256(code) !== challenge.codeHash) return { ok: false, code: 'otp_invalid' };
  otpChallenges.delete(key);
  return { ok: true };
}

/* --------------------------- single-use tokens --------------------------- */

export function createSingleUseToken(kind, payload, ttlMs) {
  const token = randomToken();
  singleUseTokens.set(`${kind}:${hashToken(token)}`, {
    payload,
    expiresAt: Date.now() + ttlMs,
    usedAt: null,
  });
  return token;
}

export function peekSingleUseToken(kind, token) {
  if (!token) return null;
  const record = singleUseTokens.get(`${kind}:${hashToken(token)}`);
  if (!record) return null;
  if (record.usedAt) return { ...record, used: true };
  if (record.expiresAt < Date.now()) return { ...record, expired: true };
  return record;
}

export function consumeSingleUseToken(kind, token) {
  const key = `${kind}:${hashToken(token)}`;
  const record = singleUseTokens.get(key);
  if (!record) return null;
  if (record.usedAt) return { used: true };
  if (record.expiresAt < Date.now()) {
    singleUseTokens.delete(key);
    return { expired: true };
  }
  record.usedAt = new Date();
  singleUseTokens.delete(key); // invalidate immediately after use
  return { record };
}

/* ---------------------------- login attempts ----------------------------- */

export function registerFailedLogin(identifier) {
  const key = identifier.toLowerCase();
  const record = loginAttempts.get(key) ?? { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= 8) {
    record.lockedUntil = Date.now() + 15 * 60 * 1000;
    record.count = 0;
  }
  loginAttempts.set(key, record);
  return record;
}

export function loginBlockInfo(identifier) {
  const record = loginAttempts.get(identifier.toLowerCase());
  if (!record) return null;
  if (record.lockedUntil > Date.now()) {
    return { locked: true, minutes: Math.ceil((record.lockedUntil - Date.now()) / 60000) };
  }
  return { locked: false };
}

export function clearLoginAttempts(identifier) {
  loginAttempts.delete(identifier.toLowerCase());
}
