import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Check, Loader2, Save } from 'lucide-react';
import { WIZARD_STEPS } from '../lib/constants';
import { cn } from '../lib/utils';
import { useRegistration } from '../context/RegistrationContext';
import { useToast } from '../context/ToastContext';

function stepIndexFromPath(pathname: string): number {
  const index = WIZARD_STEPS.findIndex((step) => pathname.startsWith(step.path));
  return index === -1 ? 0 : index;
}

export function RegistrationStepper() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { saveDraft, saving } = useRegistration();
  const toast = useToast();

  const current = stepIndexFromPath(pathname);
  const total = WIZARD_STEPS.length;
  const labels = [
    t('register.ownerStep'),
    t('register.businessStep'),
    t('register.documentsStep'),
    t('register.locationStep'),
    t('register.reviewStep'),
  ];

  const onSave = () => {
    saveDraft(true);
    toast.success(t('common.draftSaved'));
  };

  return (
    <div className="rounded-2xl border border-line bg-charcoal/70 p-4 sm:p-5">
      {/* Mobile: counter + bar */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t('common.step', { current: current + 1, total })}
        </p>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-brand/40 hover:text-brand"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {t('common.saveDraft')}
        </button>
      </div>
      <div className="mt-3 flex gap-1.5 lg:hidden" aria-hidden="true">
        {WIZARD_STEPS.map((_, index) => (
          <span
            key={index}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index <= current ? 'bg-brand' : 'bg-white/10',
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-sm font-semibold text-white lg:hidden">{labels[current]}</p>

      {/* Desktop: full stepper */}
      <div className="hidden lg:block">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t('register.title')} · {t('common.step', { current: current + 1, total })}
          </p>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-brand/40 hover:text-brand"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {t('common.saveDraft')}
          </button>
        </div>

        <ol className="flex items-center">
          {WIZARD_STEPS.map((step, index) => {
            const done = index < current;
            const active = index === current;
            return (
              <li key={step.key} className="flex flex-1 items-center last:flex-none">
                <Link
                  to={step.path}
                  aria-current={active ? 'step' : undefined}
                  className="group flex items-center gap-2.5 rounded-lg px-1 py-1 focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition',
                      done && 'border-brand bg-brand text-ink',
                      active && 'border-brand bg-brand/15 text-brand ring-2 ring-brand/30',
                      !done && !active && 'border-line-strong bg-ink text-muted group-hover:border-brand/50',
                    )}
                  >
                    {done ? <Check size={15} aria-hidden="true" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-semibold whitespace-nowrap transition',
                      active ? 'text-white' : done ? 'text-muted group-hover:text-white/80' : 'text-muted/70',
                    )}
                  >
                    {labels[index]}
                  </span>
                </Link>
                {index < total - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mx-2 h-px flex-1 transition-colors',
                      index < current ? 'bg-brand/60' : 'bg-line-strong',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export default RegistrationStepper;
