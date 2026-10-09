import { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { AppHeader } from '../../components/AppHeader';
import { RegistrationStepper } from '../../components/RegistrationStepper';
import { DemoBanner } from '../../components/DemoBanner';
import { useRegistration } from '../../context/RegistrationContext';

const STEP_PATHS = ['/register/owner', '/register/business', '/register/documents', '/register/location', '/register/review'];

/** Guards the wizard: requires an unfinished draft and blocks submitted applications. */
export function RegisterLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { draft, status, applicationId, hydrated } = useRegistration();

  const hasData =
    Boolean(draft.owner.fullName || draft.owner.mobile || draft.business.displayName) ||
    Boolean(applicationId);

  // Warn before unloading the page with unsaved registration data.
  useEffect(() => {
    if (!hasData || status === 'submitted' || status === 'approved') return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasData, status]);

  const stepKnown = STEP_PATHS.some((path) => pathname.startsWith(path));
  if (hydrated && !stepKnown) return <Navigate to="/register/owner" replace />;

  const submitted = status !== null && status !== 'draft';

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-5">
          <RegistrationStepper />
          <DemoBanner />

          {submitted ? (
            <div className="animate-fade-up rounded-2xl border border-brand/25 bg-charcoal p-6 text-center sm:p-10">
              <AlertTriangle size={28} className="mx-auto text-brand" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold text-white">{t('register.alreadySubmitted')}</h2>
              <Link
                to={`/application-status/${applicationId ?? ''}`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-ink transition hover:bg-brand-hover"
              >
                {t('register.backToStatus')}
                <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}

export default RegisterLayout;
