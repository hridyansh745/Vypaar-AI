import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { DemoBanner } from '../components/DemoBanner';
import {
  VerificationStatusCard,
  type StatusApplication,
} from '../components/VerificationStatusCard';
import { FullPageLoader } from '../components/ProtectedRoute';
import { api, ApiError } from '../lib/api';
import { messageFor } from '../lib/errors';

export function ApplicationStatusPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [application, setApplication] = useState<StatusApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await api.get<{ application: StatusApplication }>(
        `/api/business/applications/${encodeURIComponent(id)}/status`,
      );
      setApplication(res.application);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setError(err.status === 403 ? t('status.forbidden') : t('status.notFound'));
      } else {
        setError(messageFor(t, err));
      }
    } finally {
      setRefreshing(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll gently while verification is in progress.
  useEffect(() => {
    if (!application) return;
    if (!['submitted', 'pending', 'additional'].includes(application.status)) return;
    const timer = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(timer);
  }, [application, load]);

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <DemoBanner className="mb-5" />

        {!application && !error && <FullPageLoader />}

        {error && (
          <div className="animate-fade-up rounded-2xl border border-danger/30 bg-danger/10 p-8 text-center">
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-5 rounded-xl border border-line px-5 py-2.5 text-sm font-medium text-white transition hover:border-brand/40 hover:text-brand"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {application && (
          <VerificationStatusCard application={application} onRefresh={() => void load()} refreshing={refreshing} />
        )}
      </main>
    </div>
  );
}

export default ApplicationStatusPage;
