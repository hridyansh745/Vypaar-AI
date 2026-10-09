import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Clock3,
  Copy,
  FileUp,
  KeyRound,
  LifeBuoy,
  Lock,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { LoadingButton } from './LoadingButton';
import { api } from '../lib/api';
import { messageFor } from '../lib/errors';
import { useServerConfig } from '../lib/serverConfig';
import { useToast } from '../context/ToastContext';
import { cn, formatDateTime } from '../lib/utils';
import { ACCEPTED_FILE_TYPES } from '../lib/constants';

export interface StatusApplication {
  id: string;
  refId: string;
  status: string;
  createdAt?: string;
  submittedAt?: string | null;
  updatedAt?: string | null;
  additionalInfo?: { reason: string; requestedAt?: string } | null;
  activationToken?: string | null;
  owner?: { fullName?: string; email?: string; mobile?: string };
  business?: { displayName?: string; gstStatus?: string };
  documents?: { id: string; category: string; name: string; reviewStatus?: string }[];
  reviewHistory?: { status: string; at: string; note?: string }[];
}

const STATUS_STYLES: Record<string, { chip: string; dot: string }> = {
  draft: { chip: 'border-line bg-white/5 text-muted', dot: 'bg-muted' },
  submitted: { chip: 'border-info/30 bg-info/10 text-info', dot: 'bg-info' },
  pending: { chip: 'border-brand/30 bg-brand/10 text-brand', dot: 'bg-brand' },
  additional: { chip: 'border-brand/40 bg-brand/15 text-brand', dot: 'bg-brand' },
  approved: { chip: 'border-success/30 bg-success/10 text-success', dot: 'bg-success' },
  rejected: { chip: 'border-danger/30 bg-danger/10 text-danger', dot: 'bg-danger' },
};

function Timeline({ status }: { status: string }) {
  const { t } = useTranslation();
  const stages = [
    { label: t('status.step1'), reached: status !== 'draft' },
    {
      label: t('status.step2'),
      reached: ['pending', 'additional', 'approved', 'rejected'].includes(status),
      active: ['pending', 'additional'].includes(status),
    },
    {
      label: t('status.step3'),
      reached: ['approved', 'rejected'].includes(status),
      active: false,
    },
  ];

  return (
    <ol className="space-y-0">
      {stages.map((stage, index) => (
        <li key={stage.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition',
                stage.reached && !stage.active && 'border-brand bg-brand text-ink',
                stage.active && 'border-brand bg-brand/15 text-brand ring-2 ring-brand/30 animate-pulse-dot',
                !stage.reached && 'border-line-strong bg-ink text-muted',
              )}
            >
              {stage.reached && !stage.active ? <Check size={14} aria-hidden="true" /> : index + 1}
            </span>
            {index < stages.length - 1 && (
              <span
                className={cn('my-1 w-px flex-1 min-h-6', stage.reached ? 'bg-brand/50' : 'bg-line-strong')}
                aria-hidden="true"
              />
            )}
          </div>
          <p className={cn('pt-1 text-sm font-medium', stage.reached ? 'text-white' : 'text-muted')}>
            {stage.label}
          </p>
        </li>
      ))}
    </ol>
  );
}

function CopyRef({ value }: { value: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value);
        toast.success(t('status.refId'));
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-mono text-sm font-semibold text-brand transition hover:border-brand/40"
      aria-label={t('status.refId')}
    >
      {value}
      <Copy size={13} aria-hidden="true" />
    </button>
  );
}

function DemoReviewerActions({ application, onRefresh }: { application: StatusApplication; onRefresh: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { config } = useServerConfig();
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  if (!config.demoMode) return null;

  const act = async (action: 'approve' | 'reject' | 'request_info') => {
    setBusy(action);
    try {
      await api.post(`/api/business/applications/${application.id}/demo-action`, {
        action,
        reason: reason || undefined,
      });
      toast.info(t('common.demoMode'));
      onRefresh();
    } catch (err) {
      toast.error(messageFor(t, err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-brand/40 bg-brand/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('status.demoActions')}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-brand/75">{t('status.demoNote')}</p>

      <input
        type="text"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder={t('status.moreInfo', { reason: '…' })}
        className="mt-3 w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-sm text-white placeholder:text-muted/60 outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void act('approve')}
          className="rounded-lg border border-success/40 bg-success/10 px-3.5 py-2 text-xs font-semibold text-success transition hover:bg-success/20 disabled:opacity-50"
        >
          {t('status.demoApprove')}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void act('request_info')}
          className="rounded-lg border border-brand/40 bg-brand/10 px-3.5 py-2 text-xs font-semibold text-brand transition hover:bg-brand/20 disabled:opacity-50"
        >
          {t('status.demoRequestInfo')}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void act('reject')}
          className="rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-2 text-xs font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-50"
        >
          {t('status.demoReject')}
        </button>
      </div>
    </div>
  );
}

function RequestedDocumentUpload({ application }: { application: StatusApplication }) {
  const { t } = useTranslation();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast.error(t('docs.typeError', { name: file.name, max: 10 }));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('category', 'other');
      formData.append('file', file, file.name);
      await api.upload(`/api/business/applications/${application.id}/documents`, formData);
      toast.success(t('docs.uploaded'));
    } catch (err) {
      toast.error(messageFor(t, err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-line bg-ink/50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <FileUp size={16} className="text-brand" aria-hidden="true" />
        {t('status.uploadMore')}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
        <Lock size={12} aria-hidden="true" />
        {t('docs.privateNote')}
      </p>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/20 disabled:opacity-60"
      >
        {uploading ? <RefreshCw size={15} className="animate-spin" /> : <FileUp size={15} />}
        {uploading ? t('common.loading') : t('docs.addDocument')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES.join(',')}
        className="sr-only"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
    </div>
  );
}


export function VerificationStatusCard({
  application,
  onRefresh,
  refreshing,
}: {
  application: StatusApplication;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { t } = useTranslation();
  const style = STATUS_STYLES[application.status] ?? STATUS_STYLES.draft;
  const statusLabel = t(`status.statuses.${application.status}`);
  const statusDesc = t(`status.descs.${application.status}`);

  return (
    <div className="space-y-4">
      {/* Head */}
      <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('status.title')}</p>
            <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
              {application.owner?.fullName} · {application.business?.displayName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold', style.chip)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden="true" />
                {statusLabel}
              </span>
              <CopyRef value={application.refId} />
            </div>
          </div>

          <LoadingButton onClick={onRefresh} loading={refreshing} variant="secondary" block={false} className="px-4 py-2.5">
            <RefreshCw size={15} aria-hidden="true" />
            {t('status.refresh')}
          </LoadingButton>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">{statusDesc}</p>

        <dl className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">{t('status.submittedOn')}</dt>
            <dd className="mt-1 text-sm font-medium text-white">
              {application.submittedAt ? formatDateTime(application.submittedAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">{t('status.updatedOn')}</dt>
            <dd className="mt-1 text-sm font-medium text-white">
              {application.updatedAt ? formatDateTime(application.updatedAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">{t('status.createdAt')}</dt>
            <dd className="mt-1 text-sm font-medium text-white">
              {application.createdAt ? formatDateTime(application.createdAt) : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Progress */}
      <div className="rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-6">
        <p className="mb-4 text-sm font-bold text-white">{t('status.progress')}</p>
        <Timeline status={application.status} />
      </div>

      {/* Action required / decisions */}
      {application.status === 'additional' && (
        <div className="rounded-2xl border border-brand/40 bg-brand/[0.07] p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-brand">
            <AlertTriangle size={16} aria-hidden="true" />
            {t('status.actionRequired')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">
            {t('status.moreInfo', {
              reason: application.additionalInfo?.reason || t('common.notProvided'),
            })}
          </p>
          <div className="mt-4">
            <RequestedDocumentUpload application={application} />
          </div>
        </div>
      )}

      {application.status === 'rejected' && (
        <div className="rounded-2xl border border-danger/40 bg-danger/[0.07] p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-danger">
            <AlertTriangle size={16} aria-hidden="true" />
            {t('status.statuses.rejected')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">
            {application.additionalInfo?.reason || t('status.descs.rejected')}
          </p>
        </div>
      )}

      {application.status === 'approved' && (
        <div className="rounded-2xl border border-success/40 bg-success/[0.07] p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-success">
            <ShieldCheck size={16} aria-hidden="true" />
            {t('status.statuses.approved')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">{t('status.descs.approved')}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            {application.activationToken ? (
              <>
                <Link
                  to={`/activate-account?token=${encodeURIComponent(application.activationToken)}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-ink transition hover:bg-brand-hover"
                >
                  <KeyRound size={16} aria-hidden="true" />
                  {t('status.activateCta')}
                </Link>
                <span className="inline-flex items-center gap-1.5 self-center rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-xs font-medium text-brand">
                  <Clock3 size={13} aria-hidden="true" />
                  {t('status.openActivation')}
                </span>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-ink transition hover:bg-brand-hover"
              >
                <KeyRound size={16} aria-hidden="true" />
                {t('auth.signIn')}
              </Link>
            )}
          </div>
        </div>
      )}

      <DemoReviewerActions application={application} onRefresh={onRefresh} />

      {/* Support */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-charcoal/80 p-5">
        <div className="flex items-start gap-3">
          <LifeBuoy size={18} className="mt-0.5 text-brand" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-white">{t('common.needHelp')}</p>
            <p className="text-xs text-muted">{t('common.supportText')}</p>
          </div>
        </div>
        <a
          href="mailto:help@vyaparai.in"
          className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-white transition hover:border-brand/40 hover:text-brand"
        >
          {t('status.contactSupport')}
        </a>
      </div>
    </div>
  );
}

export default VerificationStatusCard;
