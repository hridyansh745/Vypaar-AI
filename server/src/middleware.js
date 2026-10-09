import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import config from './config.js';
import { getSession, loginBlockInfo } from './store.js';
import { findUserById } from './db.js';

/* ------------------------------- errors ---------------------------------- */

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(message = 'Not found') {
  return new ApiError(404, 'not_found', message);
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    const details = {};
    for (const issue of error.issues) {
      const path = issue.path.join('.') || 'form';
      (details[path] ??= []).push(issue.message);
    }
    return res.status(400).json({
      error: { code: 'validation_error', message: 'Validation failed', details },
    });
  }
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
  }
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: { code: 'file_too_large', message: 'File too large' } });
  }
  // Never leak stack traces or internal messages.
  console.error('[error]', error?.message ?? error);
  return res.status(500).json({ error: { code: 'server_error', message: 'Server error' } });
}

export function validate(req, schema, getPayload = (request) => request.body) {
  return schema.parse(getPayload(req));
}

/* ------------------------------- cookies ---------------------------------- */

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function setCookie(res, name, value, maxAgeMs) {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
    maxAge: Math.min(maxAgeMs, MAX_AGE_MS),
  });
}

export function clearCookie(res, name) {
  res.clearCookie(name, { path: '/' });
}

/* ------------------------------- auth ------------------------------------- */

export async function loadSession(req, _res, next) {
  try {
    const token = req.cookies?.vyaparai_session;
    const session = getSession(token);
    if (session) {
      const user = await findUserById(session.userId);
      if (user) req.user = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireUser(req, _res, next) {
  if (!req.user) return next(new ApiError(401, 'unauthorized', 'Sign in required'));
  next();
}

export function requireActiveUser(req, _res, next) {
  if (!req.user) return next(new ApiError(401, 'unauthorized', 'Sign in required'));
  if (req.user.accountStatus !== 'active') {
    return next(new ApiError(403, 'account_pending', 'Account is not active'));
  }
  next();
}

/** Blocks brute-force attempts before credentials are checked. */
export function loginGuard(req, _res, next) {
  const info = loginBlockInfo(req.body?.identifier ?? '');
  if (info?.locked) {
    return next(
      new ApiError(429, 'rate_limited', `Too many attempts. Retry in ${info.minutes} minute(s).`),
    );
  }
  next();
}

/* ---------------------------- rate limits --------------------------------- */

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many requests' } },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many login attempts' } },
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'otp_rate_limited', message: 'Too many OTP requests' } },
});
