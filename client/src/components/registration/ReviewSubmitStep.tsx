import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileCheck2, Pencil, Send } from 'lucide-react';
import { LoadingButton } from '../LoadingButton';
import { useRegistration, type RegistrationDraft } from '../../context/RegistrationContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useServerConfig } from '../../lib/serverConfig';
import { messageFor } from '../../lib/errors';
import type { StepKey } from '../../lib/constants';
import { cn } from '../../lib/utils';

function Row({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="max-w-[60%] text-end text-sm font-medium text-white">
        {value === undefined || value === null || value === '' ? <span className="text-muted/70">—</span> : value}
      </dd>
    </div>
  );
}

function Section({
  title,
  step,
  children,
}: {
  title: string;
  step: StepKey;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="rounded-xl border border-line bg-ink/50 p-4">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <Link
          to={`/register/${step}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-brand/40 hover:text-brand"
        >
          <Pencil size={12} aria-hidden="true" />
          {t('common.edit')}
        </Link>
      </div>
      <dl className="mt-2 divide-y divide-line/60">{children}</dl>
    </section>
  );
}

function validateDraft(t: (key: string, opts?: Record<string, unknown>) => string, draft: RegistrationDraft): StepKey | null {
  const o = draft.owner;
  if (!o.fullName.trim() || !/^[6-9]\d{9}$/.test(o.mobile) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email) || !o.consent) {
    return 'owner';
  }
  const b = draft.business;
  const l = draft.location;
  if (
    !b.displayName.trim() ||
    !b.category ||
    !b.gstStatus ||
    (b.gstStatus === 'registered' && !b.gstin.trim()) ||
    !l.state ||
    !l.city.trim() ||
    !l.locality.trim() ||
    !/^\d{6}$/.test(l.pincode) ||
    !l.street.trim()
  ) {
    return 'business';
  }
  void t;
  return null;
}

export function ReviewSubmitStep() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { draft, patchDraft, submitApplication } = useRegistration();
  const { startDemoSession } = useAuth();
  const { config } = useServerConfig();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [backendDown, setBackendDown] = useState(false);

  const o = draft.owner;
  const b = draft.business;
  const l = draft.location;

  const declarationsOk = draft.declarations.d1 && draft.declarations.d2;

  const onSubmit = async () => {
    setSubmitError(null);

    const invalidStep = validateDraft(t, draft);
    if (invalidStep) {
      toast.error(t('validate.required', { field: t(`register.${invalidStep}Step`) }));
      navigate(`/register/${invalidStep}`);
      return;
    }

    if (!declarationsOk) {
      setSubmitError(t('review.declarationRequired'));
      return;
    }

    setSubmitting(true);
    setBackendDown(false);
    try {
      const application = await submitApplication();
      if (config.demoMode) {
        // Hackathon demo flow: submission succeeded (stored server-side), and we
        // open a clearly-labelled Demo Mode session so the dashboard is usable
        // without waiting for an external verification provider.
        startDemoSession(o.fullName || 'Business Owner', b.displayName || 'My Business');
        toast.success(t('review.submittedTitle'));
        navigate('/dashboard?welcome=1', { replace: true });
        return;
      }
      toast.success(t('review.submittedTitle'));
      navigate(`/application-status/${application.id}`, { replace: true });
    } catch (err) {
      const isNetwork = err instanceof Error && 'code' in err && (err as { code: string }).code === 'network_error';
      if (isNetwork) {
        // Backend unavailable — offer a controlled, clearly-labelled demo entry.
        setBackendDown(true);
        setSubmitError(t('review.backendDown'));
      } else {
        const message = messageFor(t, err);
        setSubmitError(message);
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const continueInDemo = () => {
    startDemoSession(o.fullName || 'Business Owner', b.displayName || 'My Business');
    toast.warning(t('review.demoOnly'));
    navigate('/dashboard?welcome=1', { replace: true });
  };

  const docCount = draft.documents.filter((doc) => doc.status === 'done').length;

  return (
    <div className="animate-fade-up rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-7">
      <div>
        <h2 className="text-lg font-bold text-white">{t('review.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('review.intro')}</p>
      </div>

      <div className="mt-6 space-y-4">
        <Section title={t('review.owner')} step="owner">
          <Row label={t('owner.fullName')} value={o.fullName} />
          <Row label={t('owner.mobile')} value={o.mobile ? `+91 ${o.mobile}` : undefined} />
          <Row label={t('owner.email')} value={o.email} />
          <Row
            label={t('otp.verifyMobile')}
            value={
              o.mobileVerified ? (
                <span className="text-success">{t('otp.verified')}</span>
              ) : (
                <span className="text-brand/90">{t('review.otpPending')}</span>
              )
            }
          />
          <Row label={t('owner.language')} value={t(`languages.${o.language}`)} />
        </Section>

        <Section title={t('review.business')} step="business">
          <Row label={t('business.displayName')} value={b.displayName} />
          <Row label={t('business.legalName')} value={b.legalName} />
          <Row label={t('business.category')} value={b.category ? t(`business.categories.${b.category}`) : undefined} />
          <Row label={t('business.type')} value={t(`business.types.${b.type}`)} />
          <Row label={t('business.structure')} value={t(`business.structures.${b.structure}`)} />
          <Row
            label={t('review.gstStatus')}
            value={
              <span
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-semibold',
                  b.gstStatus === 'registered'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-line bg-white/5 text-muted',
                )}
              >
                {b.gstStatus === 'registered'
                  ? t('business.gst.registered')
                  : b.gstStatus === 'notRegistered'
                    ? t('business.gst.notRegistered')
                    : b.gstStatus === 'notApplicable'
                      ? t('business.gst.notApplicable')
                      : '—'}
              </span>
            }
          />
          {b.gstStatus === 'registered' && <Row label={t('business.gstin')} value={b.gstin} />}
          {b.licenseNumber && <Row label={t('business.licenseNumber')} value={b.licenseNumber} />}
          {!b.sameAsOwner && (
            <>
              <Row label={t('business.contactEmail')} value={b.contactEmail} />
              <Row label={t('business.contactPhone')} value={b.contactPhone ? `+91 ${b.contactPhone}` : undefined} />
            </>
          )}
        </Section>

        <Section title={t('review.documents')} step="documents">
          {docCount === 0 ? (
            <p className="py-2 text-sm text-muted">{t('review.emptyDocs')}</p>
          ) : (
            draft.documents
              .filter((doc) => doc.status === 'done')
              .map((doc) => (
                <Row
                  key={doc.id}
                  label={t(`docs.categories.${doc.category}`)}
                  value={
                    <span className="inline-flex items-center gap-2">
                      <FileCheck2 size={14} className="text-success" aria-hidden="true" />
                      <span className="truncate">{doc.name}</span>
                    </span>
                  }
                />
              ))
          )}
        </Section>

        <Section title={t('review.address')} step="location">
          <Row label={t('business.street')} value={l.street} />
          <Row label={t('business.locality')} value={l.locality} />
          <Row label={t('business.city')} value={l.city} />
          <Row label={t('business.state')} value={l.state} />
          <Row label={t('business.pincode')} value={l.pincode} />
          <Row label={t('loc.landmark')} value={l.landmark} />
          <Row label={t('loc.country')} value={l.country} />
          <Row
            label={t('review.location')}
            value={
              l.lat !== null && l.lng !== null ? (
                <span dir="ltr" className="tabular-nums text-brand">
                  {l.lat}, {l.lng}
                </span>
              ) : (
                <span className="text-muted/70">{t('review.noCoords')}</span>
              )
            }
          />
        </Section>
      </div>

      {/* Declarations */}
      <div className="mt-6 space-y-3 rounded-xl border border-brand/25 bg-brand/[0.05] p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-line bg-ink accent-brand"
            checked={draft.declarations.d1}
            onChange={(event) =>
              patchDraft((current) => ({
                ...current,
                declarations: { ...current.declarations, d1: event.target.checked },
              }))
            }
          />
          <span className="text-sm leading-relaxed text-white/85">{t('review.declaration1')}</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-line bg-ink accent-brand"
            checked={draft.declarations.d2}
            onChange={(event) =>
              patchDraft((current) => ({
                ...current,
                declarations: { ...current.declarations, d2: event.target.checked },
              }))
            }
          />
          <span className="text-sm leading-relaxed text-white/85">{t('review.declaration2')}</span>
        </label>
      </div>

      {submitError && (
        <div role="alert" className="mt-4 animate-fade-in rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {submitError}
        </div>
      )}

      {backendDown && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand/[0.07] px-4 py-3.5">
          <p className="text-sm text-brand/90">{t('review.demoOffer')}</p>
          <button
            type="button"
            onClick={continueInDemo}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand-hover"
          >
            {t('review.continueDemo')}
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => navigate('/register/location')}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-medium text-muted transition hover:border-line-strong hover:text-white"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden="true" />
          {t('common.back')}
        </button>
        <LoadingButton onClick={() => void onSubmit()} loading={submitting} disabled={!declarationsOk} className="sm:min-w-52">
          <Send size={16} aria-hidden="true" />
          {submitting ? t('review.settingUp') : t('review.submit')}
        </LoadingButton>
      </div>

      {!declarationsOk && (
        <p className="mt-3 text-xs text-muted">{t('review.declarationRequired')}</p>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted">{t('common.secureNote')}</p>
    </div>
  );
}

export default ReviewSubmitStep;
