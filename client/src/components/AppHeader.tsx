import { LifeBuoy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { VyaparAILogo } from './VyaparAILogo';
import { LanguageSelector } from './LanguageSelector';

/** Top bar used on registration, status, activation and dashboard screens. */
export function AppHeader({ showSupport = true }: { showSupport?: boolean }) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/login"
          className="rounded-lg transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-brand"
          aria-label="VyaparAI"
        >
          <VyaparAILogo size="sm" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {showSupport && (
            <a
              href="mailto:help@vyaparai.in"
              className="hidden items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-medium text-muted transition hover:border-line-strong hover:text-white sm:inline-flex"
            >
              <LifeBuoy size={14} aria-hidden="true" />
              {t('common.needHelp')}
            </a>
          )}
          <LanguageSelector compact />
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
