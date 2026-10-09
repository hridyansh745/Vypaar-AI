import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { AccountActivationForm } from '../components/AccountActivationForm';
import { DemoBanner } from '../components/DemoBanner';
import { api, ApiError } from '../lib/api';
import { messageFor } from '../lib/errors';

interface ActivateInfo {
  approved: boolean;
  ownerName?: string;
  refId?: string;
}

export function ActivateAccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [info, setInfo] = useState<ActivateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState<{ userId: string; name?: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setError(t('activate.invalidToken'));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<ActivateInfo>(
          `/api/auth/activate-info?token=${encodeURIComponent(token)}`,
        );
        if (!cancelled) setInfo(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === 'token_expired') setError(t('activate.expiredToken'));
        else if (err instanceof ApiError && (err.code === 'not_approved' || err.code === 'account_pending'))
          setError(t('activate.needApproved'));
        else setError(messageFor(t, err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader showSupport={false} />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-8 sm:px-6">
        <DemoBanner />

        {activated ? (
          <div className="animate-fade-up rounded-2xl border border-success/40 bg-success/[0.07] p-7 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-success/40 bg-success/15 text-success">
              <CheckCircle2 size={30} aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-white">{t('activate.success')}</h1>
            <div className="mx-auto mt-5 inline-flex items-center gap-3 rounded-xl border border-line bg-ink px-5 py-3">
              <span className="text-xs uppercase tracking-wide text-muted">{t('activate.userIdLabel')}</span>
              <span className="font-mono text-lg font-bold text-brand">{activated.userId}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="mt-6 w-full rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-ink transition hover:bg-brand-hover"
            >
              {t('activate.goToSignIn')}
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-line bg-charcoal/90 p-6 shadow-2xl shadow-black/60 sm:p-8">
            <div className="flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand">
                <KeyRound size={22} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-white">{t('activate.title')}</h1>
                <p className="mt-1 text-sm text-muted">{t('activate.subtitle')}</p>
                {info && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                    <ShieldCheck size={13} aria-hidden="true" />
                    {t('activate.approvedBadge')}
                    {info.refId ? ` · ${info.refId}` : ''}
                  </p>
                )}
              </div>
            </div>

            {error ? (
              <div role="alert" className="mt-5 animate-fade-in rounded-xl border border-danger/30 bg-danger/10 px-4 py-3.5 text-sm text-danger">
                {error}
              </div>
            ) : !info ? (
              <div className="mt-6 flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-brand" aria-hidden="true" />
              </div>
            ) : (
              <div className="mt-6">
                <AccountActivationForm
                  token={token}
                  onSuccess={(user) => setActivated(user)}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default ActivateAccountPage;
