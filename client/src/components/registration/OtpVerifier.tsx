import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { api } from '../../lib/api';
import { otpMessageFor } from '../../lib/errors';
import { LoadingButton } from '../LoadingButton';
import { cn } from '../../lib/utils';

type OtpStatus = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'unavailable';

interface SendResponse {
  ok: boolean;
  demoOtp?: string | null;
  expiresIn?: number;
  channel?: string;
}

const RESEND_SECONDS = 30;

/**
 * Mobile OTP verification block.
 * Verification success is ONLY shown when the backend confirms the code.
 * When no SMS/OTP provider is configured the backend labels the flow as demo.
 */
export function OtpVerifier({
  mobile,
  verified,
  onVerifiedChange,
  onStatusChange,
}: {
  mobile: string;
  verified: boolean;
  onVerifiedChange: (value: boolean) => void;
  onStatusChange?: (status: OtpStatus) => void;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<OtpStatus>(verified ? 'verified' : 'idle');
  const [code, setCode] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const lastMobile = useRef(mobile);

  // Reset when the mobile number changes.
  useEffect(() => {
    if (lastMobile.current !== mobile) {
      lastMobile.current = mobile;
      setStatus('idle');
      setCode('');
      setDemoOtp(null);
      setError(null);
      setCountdown(0);
      onVerifiedChange(false);
    }
  }, [mobile, onVerifiedChange]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((value) => (value <= 1 ? 0 : value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  // Bubble the status up so the step can block Continue while an OTP is pending.
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const send = useCallback(async () => {
    setError(null);
    setStatus('sending');
    try {
      const res = await api.post<SendResponse>('/api/auth/request-otp', {
        mobile,
        purpose: 'registration',
      });
      setDemoOtp(res?.demoOtp ?? null);
      setStatus('sent');
      setCountdown(RESEND_SECONDS);
      setCode('');
    } catch (err) {
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'network_error') {
        setStatus('unavailable');
        setError(t('otp.sendFailed'));
      } else {
        setStatus('idle');
        setError(otpMessageFor(t, err));
      }
    }
  }, [mobile, t]);

  const verify = useCallback(async () => {
    setError(null);
    setStatus('verifying');
    try {
      await api.post('/api/auth/verify-otp', { mobile, code, purpose: 'registration' });
      // Only the backend can declare success.
      setStatus('verified');
      setDemoOtp(null);
      onVerifiedChange(true);
    } catch (err) {
      setStatus('sent');
      setError(otpMessageFor(t, err));
      onVerifiedChange(false);
    }
  }, [mobile, code, t, onVerifiedChange]);

  if (status === 'verified' || verified) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
        <CheckCircle2 size={18} className="shrink-0 text-success" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-success">{t('otp.verified')}</p>
          <p className="text-xs text-success/80">+91 {mobile}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onVerifiedChange(false);
            setStatus('idle');
            setCode('');
          }}
          className="text-xs font-medium text-muted underline-offset-2 transition hover:text-white hover:underline"
        >
          {t('otp.changeNumber')}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-ink/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand/25 bg-brand/10 text-brand">
            <Smartphone size={16} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{t('otp.verifyMobile')}</p>
            <p className="text-xs text-muted">{t('owner.mobileHint')}</p>
          </div>
        </div>

        {(status === 'idle' || status === 'unavailable') && (
          <button
            type="button"
            onClick={() => void send()}
            disabled={!/^[6-9]\d{9}$/.test(mobile)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/10 px-3.5 py-2 text-xs font-semibold text-brand transition hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShieldCheck size={14} aria-hidden="true" />
            {t('owner.verifyNow')}
          </button>
        )}
      </div>

      {status === 'sending' && (
        <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted">
          <RefreshCw size={13} className="animate-spin" aria-hidden="true" />
          {t('common.loading')}
        </p>
      )}

      {(status === 'sent' || status === 'verifying') && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted">{t('otp.sentTo', { mobile })}</p>

          {demoOtp && (
            <p className="rounded-lg border border-brand/30 bg-brand/[0.07] px-3 py-2 text-xs font-medium text-brand">
              {t('otp.demoLabel', { otp: demoOtp })}
            </p>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-40">
              <label htmlFor="otp-code" className="mb-1.5 block text-xs font-medium text-white/85">
                {t('otp.enter')}
              </label>
              <input
                id="otp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-center text-base font-semibold tracking-[0.4em] text-white outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <LoadingButton
              loading={status === 'verifying'}
              disabled={code.length !== 6}
              onClick={() => void verify()}
              className="min-w-32"
              block={false}
            >
              {status === 'verifying' ? t('otp.verifying') : t('otp.verify')}
            </LoadingButton>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void send()}
              disabled={countdown > 0}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium transition',
                countdown > 0 ? 'cursor-not-allowed text-muted/70' : 'text-brand hover:underline',
              )}
            >
              <RefreshCw size={13} aria-hidden="true" />
              {countdown > 0 ? t('otp.resendIn', { seconds: countdown }) : t('otp.resend')}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus('idle');
                setError(null);
              }}
              className="text-xs text-muted transition hover:text-white hover:underline"
            >
              {t('otp.skip')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      {status !== 'sent' && status !== 'verifying' && !error && (
        <p className="mt-3 text-xs leading-relaxed text-muted">{t('otp.notRequired')}</p>
      )}
      {status === 'unavailable' && (
        <p className="mt-2 text-xs leading-relaxed text-brand/80">{t('common.errorNetwork')}</p>
      )}
    </div>
  );
}

export default OtpVerifier;
