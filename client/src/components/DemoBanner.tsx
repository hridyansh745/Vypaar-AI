import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useServerConfig } from '../lib/serverConfig';
import { cn } from '../lib/utils';

/**
 * Shows an honest "Demo Mode" notice whenever the backend reports that
 * external providers (OTP/SMS/email/verification) are not configured.
 */
export function DemoBanner({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { config } = useServerConfig();

  if (!config.demoMode) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-brand/25 bg-brand/[0.07] px-3.5 py-2.5 text-xs leading-relaxed text-brand/90',
        className,
      )}
      role="note"
    >
      <FlaskConical size={15} className="mt-px shrink-0" aria-hidden="true" />
      <div>
        <span className="font-semibold">{t('common.demoMode')}</span>
        <p className="mt-0.5 text-brand/70">{t('common.demoModeNote')}</p>
      </div>
    </div>
  );
}

export default DemoBanner;
