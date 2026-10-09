import type { TFunction } from 'i18next';
import { ApiError } from './api';

/** Map any thrown error to a user-safe, translated message. Never leaks internals. */
export function messageFor(t: TFunction, error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'network_error') return t('common.errorNetwork');
    const key = `errors.${error.code}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return t('common.errorGeneric');
  }
  if (error instanceof Error && error.name === 'TypeError') return t('common.errorNetwork');
  return t('common.errorGeneric');
}

/** Extract a per-field message for a known code (e.g. otp_invalid → otp.invalid). */
export function otpMessageFor(t: TFunction, error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'otp_expired') return t('otp.expired');
    if (error.code === 'otp_rate_limited') return t('otp.limit');
    if (error.code === 'otp_invalid') return t('otp.invalid');
  }
  return messageFor(t, error);
}
