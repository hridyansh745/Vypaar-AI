import 'dotenv/config';
import crypto from 'node:crypto';

const env = process.env;

function bool(value) {
  return Boolean(value && value.trim() !== '');
}

export const config = {
  port: Number(env.PORT) > 0 ? Number(env.PORT) : 4000,
  nodeEnv: env.NODE_ENV || 'development',
  mongoUri: env.MONGODB_URI || '',
  // Secret used to sign nothing sensitive in plain form — tokens are random + hashed.
  sessionSecret: env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  cookieSecure: env.COOKIE_SECURE === 'true',
  clientOrigin: env.CLIENT_ORIGIN || 'http://localhost:5173',

  // External providers — only "configured" when real credentials exist.
  providers: {
    otp: {
      configured: bool(env.OTP_PROVIDER) && bool(env.OTP_API_KEY),
      channel: env.OTP_PROVIDER || 'none',
    },
    sms: {
      configured: bool(env.SMS_PROVIDER) && bool(env.SMS_API_KEY),
      channel: env.SMS_PROVIDER || 'none',
    },
    email: {
      configured: bool(env.EMAIL_PROVIDER) && bool(env.EMAIL_API_KEY),
      channel: env.EMAIL_PROVIDER || 'none',
    },
    map: {
      configured: bool(env.MAP_PROVIDER) && bool(env.MAP_API_KEY),
      provider: env.MAP_PROVIDER || null,
    },
    verification: {
      configured: bool(env.VERIFICATION_PROVIDER) && bool(env.VERIFICATION_API_KEY),
      provider: env.VERIFICATION_PROVIDER || null,
    },
    storage: {
      configured: bool(env.S3_BUCKET) && bool(env.S3_REGION),
      provider: bool(env.S3_BUCKET) ? 's3-private' : 'local-private',
    },
    ai: {
      configured: bool(env.AI_API_KEY || env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY),
      provider:
        env.AI_PROVIDER ||
        (env.ANTHROPIC_API_KEY ? 'anthropic' : env.OPENAI_API_KEY ? 'openai' : ''),
      key: env.AI_API_KEY || env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY || '',
      model: env.AI_MODEL || '',
    },
  },
};

/**
 * Demo mode: simulated OTP/verification results are used and must be labelled.
 * It flips off automatically once OTP + verification providers are configured,
 * or can be forced either way with DEMO_MODE.
 */
config.demoMode =
  env.DEMO_MODE === 'true'
    ? true
    : env.DEMO_MODE === 'false'
      ? false
      : !(config.providers.otp.configured && config.providers.verification.configured);

config.bcryptRounds = Number(env.BCRYPT_ROUNDS || 12);

export default config;
