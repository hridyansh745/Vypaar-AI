import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Boxes, Sparkles, ShieldCheck } from 'lucide-react';
import { VyaparAILogo } from './VyaparAILogo';
import { LanguageSelector } from './LanguageSelector';
import { cn } from '../lib/utils';

function FeatureItem({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3.5 rounded-2xl border border-line/70 bg-white/[0.03] p-4 transition hover:border-brand/30 hover:bg-white/[0.05]">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{desc}</span>
      </span>
    </li>
  );
}

/** Decorative, clearly non-interactive dashboard preview. */
function DashboardPreview() {
  const { t } = useTranslation();
  const bars = [42, 58, 36, 72, 55, 84, 66];
  return (
    <div className="rounded-2xl border border-line bg-charcoal/80 p-5 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          {t('features.previewLabel')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" aria-hidden="true" />
          +12.4%
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-ink/70 p-3">
          <p className="text-[11px] text-muted">{t('features.previewSales')}</p>
          <p className="mt-1 text-lg font-bold text-white">₹12,450</p>
        </div>
        <div className="rounded-xl bg-ink/70 p-3">
          <p className="text-[11px] text-muted">{t('features.previewProfit')}</p>
          <p className="mt-1 text-lg font-bold text-brand">₹2,180</p>
        </div>
        <div className="rounded-xl bg-ink/70 p-3">
          <p className="text-[11px] text-muted">{t('features.previewStock')}</p>
          <p className="mt-1 text-lg font-bold text-white">4</p>
        </div>
      </div>

      <div className="mt-4 flex h-28 items-end gap-2.5" aria-hidden="true">
        {bars.map((height, index) => (
          <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-brand/15 to-brand/70 transition-all duration-500 hover:to-brand" style={{ height: `${height}%` }} />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">{t('features.previewTrend')}</p>
    </div>
  );
}

/**
 * Split-screen authentication layout.
 * Desktop: brand introduction on the left, form card on the right.
 * Mobile: compact branding above the form.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-ink lg:grid lg:grid-cols-[1.08fr_1fr]">
      {/* Left — brand introduction */}
      <section className="relative overflow-hidden border-b border-line bg-grid radial-fade px-5 py-7 sm:px-8 lg:border-b-0 lg:border-e lg:px-12 lg:py-10 xl:px-16">
        <div className="flex items-center justify-between gap-4">
          <VyaparAILogo size="md" />
          <div className="lg:hidden">
            <LanguageSelector compact />
          </div>
        </div>

        <div className="mt-7 lg:mt-14 xl:mt-20">
          <h1 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.6rem]">
            {t('common.tagline')}
          </h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-brand to-brand/0" aria-hidden="true" />
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            <span className="font-medium text-white/85">{t('common.description')}</span>
            <span className="mt-2 block">{t('features.aboutText')}</span>
          </p>

          <ul className="mt-7 hidden gap-3 md:grid md:grid-cols-1 xl:grid-cols-1">
            <FeatureItem
              icon={<BarChart3 size={17} />}
              title={t('features.sales')}
              desc={t('features.salesDesc')}
            />
            <FeatureItem icon={<Boxes size={17} />} title={t('features.inventory')} desc={t('features.inventoryDesc')} />
            <FeatureItem
              icon={<Sparkles size={17} />}
              title={t('features.assistant')}
              desc={t('features.assistantDesc')}
            />
          </ul>

          <div className="mt-8 hidden lg:block">
            <DashboardPreview />
          </div>
        </div>

        <p className="mt-8 hidden items-center gap-2 text-xs text-muted lg:flex">
          <ShieldCheck size={14} className="text-brand" aria-hidden="true" />
          {t('common.secureNote')}
        </p>
      </section>

      {/* Right — authentication card */}
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:min-h-0 lg:px-12 lg:py-8 xl:px-16">
        <header className="flex items-center justify-between gap-4 lg:justify-end">
          <LinkShell>
            <div className="lg:hidden">
              <VyaparAILogo size="sm" />
            </div>
          </LinkShell>
          <div className="hidden lg:block">
            <LanguageSelector />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md animate-fade-up">{children}</div>
        </main>

        <footer className="mx-auto flex max-w-md items-start gap-2 text-center text-xs leading-relaxed text-muted sm:text-start">
          <ShieldCheck size={14} className="mt-px shrink-0 text-brand/80" aria-hidden="true" />
          <span>{t('common.secureNote')}</span>
        </footer>
      </section>
    </div>
  );
}

function LinkShell({ children }: { children: ReactNode }) {
  return <div className={cn('flex items-center')}>{children}</div>;
}

export default AuthLayout;
