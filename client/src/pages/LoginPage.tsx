import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../components/AuthLayout';
import { SignInForm } from '../components/SignInForm';
import { RegistrationForm } from '../components/RegistrationForm';
import { DemoBanner } from '../components/DemoBanner';
import { cn } from '../lib/utils';

type Tab = 'signin' | 'signup';

export function LoginPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('signin');

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-line bg-charcoal/90 p-6 shadow-2xl shadow-black/60 sm:p-8">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label={t('common.brand')}
          className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-ink/60 p-1"
        >
          <button
            role="tab"
            type="button"
            aria-selected={tab === 'signin'}
            onClick={() => setTab('signin')}
            className={cn(
              'rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-brand',
              tab === 'signin'
                ? 'bg-brand text-ink shadow-[0_8px_24px_-12px_rgba(255,212,59,0.6)]'
                : 'text-muted hover:text-white',
            )}
          >
            {t('auth.signIn')}
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={tab === 'signup'}
            onClick={() => setTab('signup')}
            className={cn(
              'rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-brand',
              tab === 'signup'
                ? 'bg-brand text-ink shadow-[0_8px_24px_-12px_rgba(255,212,59,0.6)]'
                : 'text-muted hover:text-white',
            )}
          >
            {t('auth.createAccount')}
          </button>
        </div>

        <div className="mt-7" role="tabpanel">
          {tab === 'signin' ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">{t('auth.signInTitle')}</h2>
                <p className="mt-1.5 text-sm text-muted">{t('auth.signInSubtitle')}</p>
              </div>
              <SignInForm />
              <p className="text-center text-sm text-muted">
                {t('auth.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setTab('signup')}
                  className="font-medium text-brand transition hover:text-brand-hover hover:underline"
                >
                  {t('auth.createAccount')}
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">{t('auth.createAccountTitle')}</h2>
                <p className="mt-1.5 text-sm text-muted">{t('auth.createAccountSubtitle')}</p>
              </div>
              <RegistrationForm onNavigateToSignIn={() => setTab('signin')} />
            </div>
          )}
        </div>

        <div className="mt-7 border-t border-line pt-5">
          <p className="text-xs leading-relaxed text-muted">
            {t('common.privacyTitle')} — {t('common.secureNote')}
          </p>
          <DemoBanner className="mt-3" />
        </div>
      </div>
    </AuthLayout>
  );
}

export default LoginPage;
