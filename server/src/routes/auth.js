import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import config from '../config.js';
import {
  ApiError,
  apiLimiter,
  asyncHandler,
  clearCookie,
  loginGuard,
  loginLimiter,
  otpLimiter,
  setCookie,
  validate,
} from '../middleware.js';
import {
  clearLoginAttempts,
  createOtpChallenge,
  createSession,
  createSingleUseToken,
  consumeSingleUseToken,
  destroySession,
  loginBlockInfo,
  newUserId,
  peekSingleUseToken,
  registerFailedLogin,
  sessions,
  verifyOtpChallenge,
  verifiedMobiles,
  demoActivationTokens,
} from '../store.js';
import {
  createApplication,
  createBusiness,
  createUser,
  findUserById,
  findUserByIdentifier,
  getApplicationById,
  serializeUser,
  updateUser,
} from '../db.js';

export const authRouter = Router();

const PASSWORD_MIN = 8;

function weakPassword(value) {
  if (value.length < PASSWORD_MIN) return true;
  if (/^[6-9]\d{9}$/.test(value)) return true; // mobile number
  if (/\d{10,}/.test(value)) return true; // long numeric runs (GSTIN/PAN)
  if (/(.)\1{3,}/.test(value)) return true;
  if (/^(password|passw0rd|qwerty|abcdef|12345678|admin|vyaparai)/i.test(value)) return true;
  return false;
}

const identifierSchema = z.string().trim().min(3, 'Identifier is required');
const passwordSchema = z.string().min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`);
const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

function issueSession(res, userId, remember) {
  const { token, ttl } = createSession(userId, remember);
  setCookie(res, 'vyaparai_session', token, ttl);
}

function invalidateUserSessions(userId) {
  for (const [hash, record] of sessions.entries()) {
    if (record.userId === userId) sessions.delete(hash);
  }
}

/* ------------------------------ register --------------------------------- */

authRouter.post(
  '/register',
  apiLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(req, 
      z.object({
        name: z.string().trim().min(2),
        email: z.string().trim().email().toLowerCase(),
        mobile: mobileSchema,
        language: z.enum(['en', 'hi', 'bho', 'awa', 'ur']).default('hi'),
      }),
    );

    const existing = await findUserByIdentifier(body.email);
    const existingMobile = await findUserByIdentifier(body.mobile);
    if (existing) throw new ApiError(409, 'duplicate_email', 'Email already registered');
    if (existingMobile) throw new ApiError(409, 'duplicate_mobile', 'Mobile already registered');

    const user = await createUser({
      userId: newUserId(),
      name: body.name,
      email: body.email,
      mobile: body.mobile,
      language: body.language,
      accountStatus: 'pending_verification',
      role: 'owner',
      passwordHash: null,
    });

    res.status(201).json({ user: serializeUser(user) });
  }),
);

/* -------------------------------- login ----------------------------------- */

authRouter.post(
  '/login',
  loginLimiter,
  loginGuard,
  asyncHandler(async (req, res) => {
    const body = validate(req, 
      z.object({ identifier: identifierSchema, password: z.string().min(1), remember: z.boolean().optional() }),
    );

    const identifier = body.identifier.trim();
    const user = await findUserByIdentifier(identifier);

    const genericFailure = new ApiError(401, 'invalid_credentials', 'Invalid credentials');
    if (!user || !user.passwordHash) {
      registerFailedLogin(identifier);
      throw genericFailure;
    }

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      registerFailedLogin(identifier);
      throw genericFailure;
    }

    if (user.accountStatus === 'pending_verification') {
      throw new ApiError(403, 'account_pending', 'Account not activated yet');
    }
    if (user.accountStatus !== 'active') {
      throw new ApiError(403, 'account_rejected', 'Account cannot sign in');
    }

    clearLoginAttempts(identifier);
    await updateUser(user.id ?? user._id, { lastLoginAt: new Date() });
    issueSession(res, user.id ?? user._id, Boolean(body.remember));

    res.json({ user: serializeUser(user) });
  }),
);

/* -------------------------------- logout ---------------------------------- */

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    destroySession(req.cookies?.vyaparai_session);
    clearCookie(res, 'vyaparai_session');
    res.json({ ok: true });
  }),
);

/* ---------------------------------- me ------------------------------------- */

authRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ user: req.user ? serializeUser(req.user) : null });
  }),
);

/* --------------------------- forgot / reset -------------------------------- */

authRouter.post(
  '/forgot-password',
  apiLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(req, z.object({ identifier: identifierSchema }));
    const user = await findUserByIdentifier(body.identifier.trim());

    let demoResetUrl = null;
    if (user) {
      const token = createSingleUseToken('reset', { userId: user.id ?? user._id }, 60 * 60 * 1000);
      if (config.demoMode) demoResetUrl = `/reset-password?token=${encodeURIComponent(token)}`;
      // With EMAIL/SMS configured, deliver the link here via the provider adapter.
    }

    // Always the same response shape — never reveals whether an account exists.
    res.json({ ok: true, message: 'If that account exists, a reset link has been sent.', demoResetUrl });
  }),
);

authRouter.post(
  '/reset-password',
  apiLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(req, z.object({ token: z.string().min(10), password: passwordSchema }));
    if (weakPassword(body.password)) {
      throw new ApiError(400, 'validation_error', 'Password is too easy to guess');
    }

    const consumed = consumeSingleUseToken('reset', body.token);
    if (!consumed || consumed.used || consumed.expired) {
      throw new ApiError(400, consumed?.expired ? 'token_expired' : 'token_invalid', 'Reset link is invalid or expired');
    }

    const user = await findUserById(consumed.record.payload.userId);
    if (!user) throw new ApiError(404, 'not_found', 'Account not found');

    await updateUser(user.id ?? user._id, { passwordHash: await bcrypt.hash(body.password, config.bcryptRounds) });
    invalidateUserSessions(user.id ?? user._id);

    res.json({ ok: true });
  }),
);

/* --------------------------------- OTP -------------------------------------- */

authRouter.post(
  '/request-otp',
  otpLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(req, 
      z.object({ mobile: mobileSchema, purpose: z.enum(['registration', 'login']).default('registration') }),
    );

    if (!config.demoMode && !config.providers.otp.configured) {
      // Do not pretend an SMS was sent when no provider is configured.
      throw new ApiError(503, 'unavailable', 'OTP provider is not configured');
    }

    const code = createOtpChallenge(body.mobile, body.purpose);

    res.json({
      ok: true,
      expiresIn: 300,
      channel: config.providers.otp.channel,
      // Demo mode only: surfaced in the UI with a clear "Demo Mode" label.
      demoOtp: config.demoMode ? code : null,
      delivered: false,
    });
  }),
);

authRouter.post(
  '/verify-otp',
  otpLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(req, 
      z.object({
        mobile: mobileSchema,
        code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
        purpose: z.enum(['registration', 'login']).default('registration'),
      }),
    );

    const result = verifyOtpChallenge(body.mobile, body.purpose, body.code);
    if (!result.ok) throw new ApiError(400, result.code, 'OTP verification failed');

    // Remember the confirmation so it survives until the application is filed.
    verifiedMobiles.set(body.mobile, Date.now() + 30 * 60 * 1000);
    const user = await findUserByIdentifier(body.mobile);
    if (user) {
      const list = Array.isArray(user.verifiedMobiles) ? user.verifiedMobiles : [];
      if (!list.includes(body.mobile)) {
        await updateUser(user.id ?? user._id, { verifiedMobiles: [...list, body.mobile] });
      }
    }

    res.json({ ok: true, verified: true });
  }),
);

/* ------------------------------- activation -------------------------------- */

authRouter.get(
  '/activate-info',
  apiLimiter,
  asyncHandler(async (req, res) => {
    const token = String(req.query.token ?? '');
    const record = peekSingleUseToken('activation', token);
    if (!record) throw new ApiError(400, 'token_invalid', 'Activation link is invalid');
    if (record.used) throw new ApiError(400, 'token_invalid', 'Activation link was already used');
    if (record.expired) throw new ApiError(410, 'token_expired', 'Activation link expired');

    const application = await getApplicationById(record.payload.applicationId);
    if (!application || application.status !== 'approved') {
      throw new ApiError(403, 'not_approved', 'Application is not approved');
    }

    let ownerName = '';
    if (application.owner) {
      const owner = await findUserById(application.owner);
      ownerName = owner?.name ?? '';
    }

    res.json({ approved: true, ownerName, refId: application.refId });
  }),
);

authRouter.post(
  '/activate-account',
  apiLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(req, z.object({ token: z.string().min(10), password: passwordSchema }));
    if (weakPassword(body.password)) {
      throw new ApiError(400, 'validation_error', 'Password is too easy to guess');
    }

    const consumed = consumeSingleUseToken('activation', body.token);
    if (!consumed || consumed.used || consumed.expired) {
      throw new ApiError(
        400,
        consumed?.expired ? 'token_expired' : 'token_invalid',
        'Activation link is invalid or expired',
      );
    }

    const { applicationId } = consumed.record.payload;
    demoActivationTokens.delete(String(applicationId));
    const application = await getApplicationById(applicationId);
    if (!application) throw new ApiError(404, 'not_found', 'Application not found');
    if (application.status !== 'approved') {
      throw new ApiError(403, 'not_approved', 'Application is not approved');
    }

    let user = application.owner ? await findUserById(application.owner) : null;
    if (!user) {
      // No owner existed (edge case): create an active account now.
      user = await createUser({
        userId: newUserId(),
        name: application.ownerSummary?.name ?? 'Business Owner',
        email: application.ownerSummary?.email ?? '',
        mobile: application.ownerSummary?.mobile ?? '',
        language: application.language ?? 'hi',
        accountStatus: 'active',
        role: 'owner',
        passwordHash: await bcrypt.hash(body.password, config.bcryptRounds),
      });
      await createApplicationUpdate(application.id, { owner: user.id ?? user._id });
    } else {
      await updateUser(user.id ?? user._id, {
        passwordHash: await bcrypt.hash(body.password, config.bcryptRounds),
        accountStatus: 'active',
        userId: user.userId || newUserId(),
      });
    }

    res.json({ user: serializeUser(user) });
  }),
);

// Small helper to avoid a circular import with the business router.
async function createApplicationUpdate(id, patch) {
  const { updateApplication } = await import('../db.js');
  await updateApplication(id, patch);
}

export default authRouter;
