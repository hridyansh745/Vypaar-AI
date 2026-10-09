import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { VyaparAILogo } from '../components/VyaparAILogo';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink px-6 text-center">
      <VyaparAILogo size="md" />
      <p className="text-6xl font-extrabold text-brand">404</p>
      <p className="text-sm text-muted">{t('errors.not_found')}</p>
      <Link
        to="/login"
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-ink transition hover:bg-brand-hover"
      >
        <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden="true" />
        {t('auth.signIn')}
      </Link>
    </div>
  );
}

export default NotFoundPage;
