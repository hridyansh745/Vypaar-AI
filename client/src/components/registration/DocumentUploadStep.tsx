import { useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  ImagePlus,
  Lock,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { LoadingButton } from '../LoadingButton';
import { useRegistration, type DraftDocument } from '../../context/RegistrationContext';
import { useToast } from '../../context/ToastContext';
import {
  ACCEPTED_FILE_LABEL,
  ACCEPTED_FILE_TYPES,
  DOC_CATEGORIES,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  type DocCategory,
} from '../../lib/constants';
import { cn, formatBytes, isImageMime } from '../../lib/utils';
import { messageFor } from '../../lib/errors';

function categoryLabel(t: (key: string) => string, category: DocCategory): string {
  return t(`docs.categories.${category}`);
}

function UploadRow({ category, required }: { category: DocCategory; required: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { draft, uploadDocument, removeDocument, applicationId } = useRegistration();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const docs = draft.documents.filter((doc) => doc.category === category);
  const doc: DraftDocument | undefined = docs[0];

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast.error(t('docs.typeError', { name: file.name, max: 10 }));
      return;
    }
    const limit = file.type === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) {
      toast.error(t('docs.maxSizeError', { name: file.name, max: limit / (1024 * 1024) }));
      return;
    }
    try {
      if (doc) await removeDocument(doc.id);
      await uploadDocument(file, category);
    } catch (err) {
      toast.error(messageFor(t, err));
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="rounded-xl border border-line bg-ink/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-white">
          <FileText size={15} className="text-brand" aria-hidden="true" />
          {categoryLabel(t, category)}
          {required ? (
            <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
              {t('common.required')}
            </span>
          ) : (
            <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {t('docs.optionalLabel')}
            </span>
          )}
        </p>
      </div>

      {!doc && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition',
            dragging ? 'border-brand bg-brand/5' : 'border-line-strong/70 bg-ink/40',
          )}
        >
          <UploadCloud size={22} className={cn('transition', dragging ? 'text-brand' : 'text-muted')} aria-hidden="true" />
          <p className="mt-2 text-xs text-muted">
            {t('docs.dragDrop')}{' '}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-semibold text-brand underline-offset-2 hover:underline"
            >
              {t('docs.browse')}
            </button>
          </p>
          <p className="mt-1 text-[11px] text-muted/70">
            {ACCEPTED_FILE_LABEL} · {formatBytes(MAX_IMAGE_BYTES)} / PDF {formatBytes(MAX_PDF_BYTES)}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES.join(',')}
            className="sr-only"
            onChange={(event) => void handleFiles(event.target.files)}
          />
        </div>
      )}

      {doc && (
        <div className="mt-3 space-y-2.5 rounded-xl border border-line bg-ink/60 p-3">
          <div className="flex items-start gap-3">
            {isImageMime(doc.type) && doc.status === 'done' && doc.serverId && applicationId ? (
              <img
                src={`/api/business/applications/${applicationId}/documents/${doc.serverId}/file`}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover"
                onError={(event) => {
                  const el = event.currentTarget as HTMLImageElement;
                  el.replaceWith(el.previousElementSibling ?? el);
                }}
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-ink text-muted">
                <FileText size={18} aria-hidden="true" />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{doc.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {doc.type.replace('image/', '').replace('application/', '').toUpperCase()} · {formatBytes(doc.size)}
              </p>

              {doc.status === 'uploading' && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${doc.progress}%` }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums text-brand">
                    {t('docs.uploading', { percent: doc.progress })}
                  </span>
                </div>
              )}

              {doc.status === 'done' && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-success">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  {t('docs.uploaded')}
                </p>
              )}
              {doc.status === 'error' && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-danger">
                  <ShieldAlert size={13} aria-hidden="true" />
                  {t('docs.failed')}
                </p>
              )}
              {doc.status === 'local' && (
                <p className="mt-1 text-xs text-muted">{t('docs.localPending')}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={() => void removeDocument(doc.id)}
                className="rounded-lg p-1.5 text-muted transition hover:bg-danger/15 hover:text-danger"
                aria-label={t('docs.removeFile')}
              >
                <Trash2 size={15} />
              </button>
              {doc.status === 'error' && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-lg p-1.5 text-muted transition hover:bg-brand/15 hover:text-brand"
                  aria-label={t('common.retry')}
                >
                  <RefreshCw size={15} />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-brand transition hover:underline"
          >
            {t('docs.replaceFile')}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES.join(',')}
            className="sr-only"
            onChange={(event) => void handleFiles(event.target.files)}
          />
        </div>
      )}
    </div>
  );
}

export function DocumentUploadStep() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { draft } = useRegistration();

  const anyUploading = draft.documents.some((doc) => doc.status === 'uploading');

  // Photographs help verification, but nothing is forced: every upload is optional.
  const onContinue = () => {
    navigate('/register/location');
  };

  return (
    <div className="animate-fade-up rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-7">
      <div>
        <h2 className="text-lg font-bold text-white">{t('register.documentsStep')}</h2>
        <p className="mt-1 text-sm text-muted">{t('register.documentsHint')}</p>
      </div>

      <p className="mt-4 rounded-xl border border-line bg-ink/40 px-4 py-3 text-xs leading-relaxed text-muted">
        {t('docs.intro')}
      </p>

      <div className="mt-5 space-y-4">
        {DOC_CATEGORIES.map((category) => (
          <UploadRow key={category} category={category} required={false} />
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <Lock size={14} className="mt-px shrink-0 text-brand/80" aria-hidden="true" />
          {t('docs.privateNote')}
        </p>
        <p className="flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/[0.05] px-4 py-3 text-xs leading-relaxed text-brand/85">
          <ShieldAlert size={15} className="mt-px shrink-0" aria-hidden="true" />
          {t('docs.sensitiveNote')}
        </p>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => navigate('/register/business')}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-medium text-muted transition hover:border-line-strong hover:text-white"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden="true" />
          {t('common.back')}
        </button>
        <LoadingButton onClick={onContinue} disabled={anyUploading} block={false} className="sm:min-w-44">
          {t('common.continue')}
          <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
        </LoadingButton>
      </div>
      {anyUploading && (
        <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted">
          <ImagePlus size={13} className="animate-pulse" aria-hidden="true" />
          {t('common.loading')}
        </p>
      )}
    </div>
  );
}

export default DocumentUploadStep;
