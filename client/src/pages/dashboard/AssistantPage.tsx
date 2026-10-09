import { useTranslation } from 'react-i18next';
import { Cpu } from 'lucide-react';
import { AiPanel } from '../../components/dashboard/AiPanel';
import { useServerConfig } from '../../lib/serverConfig';

export function AssistantPage() {
  const { t } = useTranslation();
  const { config } = useServerConfig();

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">{t('dash2.ai.pageTitle')}</h1>
        <p className="mt-0.5 text-xs text-muted">{t('dash2.ai.pageSub')}</p>
      </div>

      <div className="h-[70vh] min-h-[480px]">
        <AiPanel aiConfigured={config.ai.configured} aiProvider={config.ai.provider} />
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-[#171717] px-4 py-3.5">
        <Cpu size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted">{t('dash2.ai.privacyNote')}</p>
      </div>
    </div>
  );
}

export default AssistantPage;
