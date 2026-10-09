import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, CircleHelp, LogOut, MessageCircle, Phone, Save } from 'lucide-react';
import { DashCard } from '../../components/dashboard/DashCard';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { STORE_KEYS, loadStore, saveStore } from '../../lib/demoData';
import { cn } from '../../lib/utils';

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(() =>
    loadStore(STORE_KEYS.prefs, { lowStock: true, orders: true, overdue: true, offers: true }),
  );

  const save = () => {
    saveStore(STORE_KEYS.prefs, prefs);
    toast.success(t('dash2.settings.saved'));
  };

  const onSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const toggles = [
    { key: 'lowStock' as const, label: t('dash2.settings.lowStock') },
    { key: 'orders' as const, label: t('dash2.settings.orders') },
    { key: 'overdue' as const, label: t('dash2.settings.overdue') },
    { key: 'offers' as const, label: t('dash2.settings.offers') },
  ];

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">{t('dash2.settingsTitle')}</h1>
        <p className="mt-0.5 text-xs text-muted">{t('dash2.settingsSubtitle')}</p>
      </div>

      <DashCard title={t('dash2.settings.profile')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label={t('dash2.f.business')} value={user?.businessName || user?.name || '—'} />
          <Row label={t('dash2.f.userId')} value={user?.userId || '—'} />
        </div>
      </DashCard>

      <DashCard title={t('common.language')}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">{t('dash2.settings.langNote')}</p>
          <LanguageSelector compact />
        </div>
      </DashCard>

      <DashCard title={t('dash2.settings.alerts')} action={<Bell size={15} className="text-brand" aria-hidden="true" />}>
        <ul className="space-y-2.5">
          {toggles.map(({ key, label }) => (
            <li key={key} className="flex items-center justify-between rounded-xl border border-line bg-charcoal/60 px-3.5 py-3">
              <span className="text-sm text-white/85">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[key]}
                aria-label={label}
                onClick={() => setPrefs({ ...prefs, [key]: !prefs[key] })}
                className={cn(
                  'relative h-6 w-11 rounded-full border transition',
                  prefs[key] ? 'border-brand bg-brand/80' : 'border-line bg-charcoal',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4.5 w-4.5 h-[18px] w-[18px] rounded-full transition-all',
                    prefs[key] ? 'start-[22px] bg-ink' : 'start-0.5 bg-muted',
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={save}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand-hover"
        >
          <Save size={15} aria-hidden="true" /> {t('dash2.settings.save')}
        </button>
        <p className="mt-2 text-[11px] text-muted">{t('dash2.settings.prefsNote')}</p>
      </DashCard>

      <button
        type="button"
        onClick={() => void onSignOut()}
        className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:border-danger/40 hover:text-danger"
      >
        <LogOut size={15} aria-hidden="true" /> {t('dash.signOut')}
      </button>
    </div>
  );
}

export function HelpPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);
  const faqs = ['q1', 'q2', 'q3', 'q4'] as const;

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">{t('dash2.helpTitle')}</h1>
        <p className="mt-0.5 text-xs text-muted">{t('dash2.helpSubtitle')}</p>
      </div>

      <DashCard title={t('dash2.help.faq')} action={<CircleHelp size={15} className="text-brand" aria-hidden="true" />}>
        <ul className="space-y-2">
          {faqs.map((q, i) => (
            <li key={q} className="overflow-hidden rounded-xl border border-line bg-charcoal/60">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-start text-sm font-medium text-white/90"
              >
                {t(`dash2.help.${q}`)}
                <ChevronDown size={15} className={cn('shrink-0 text-muted transition-transform', open === i && 'rotate-180')} aria-hidden="true" />
              </button>
              {open === i && (
                <p className="border-t border-line/60 px-3.5 py-3 text-xs leading-relaxed text-muted">
                  {t(`dash2.help.a${i + 1}`)}
                </p>
              )}
            </li>
          ))}
        </ul>
      </DashCard>

      <DashCard title={t('dash2.help.contact')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-charcoal/60 px-3.5 py-3">
            <Phone size={16} className="text-brand" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-white">1800-XXX-XXXX</p>
              <p className="text-[10px] text-muted">{t('common.supportText')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-charcoal/60 px-3.5 py-3">
            <MessageCircle size={16} className="text-brand" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-white">help@vyaparai.example</p>
              <p className="text-[10px] text-muted">{t('common.needHelp')}</p>
            </div>
          </div>
        </div>
      </DashCard>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-charcoal/60 px-3.5 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export default SettingsPage;
