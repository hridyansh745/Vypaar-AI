import { useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, X } from 'lucide-react';
import { FormField, SelectField } from '../FormField';
import { LoadingButton } from '../LoadingButton';
import { OtpVerifier } from './OtpVerifier';
import { useRegistration } from '../../context/RegistrationContext';
import { useToast } from '../../context/ToastContext';
import { LANGUAGES } from '../../i18n';
import { MAX_PHOTO_BYTES, type StepKey } from '../../lib/constants';
import { cn } from '../../lib/utils';

export function OwnerDetailsStep() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { draft, patchDraft } = useRegistration();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [otpStatus, setOtpStatus] = useState<string>('idle');

  const schema = z.object({
    fullName: z.string().trim().min(1, t('validate.required', { field: t('owner.fullName') })),
    mobile: z.string().trim().regex(/^[6-9]\d{9}$/, t('validate.mobile')),
    email: z
      .string()
      .trim()
      .min(1, t('validate.required', { field: t('owner.email') }))
      .email(t('validate.email')),
    language: z.string().min(1, t('validate.select')),
    consent: z.boolean().refine((v) => v === true, { message: t('owner.consentRequired') }),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      fullName: draft.owner.fullName,
      mobile: draft.owner.mobile,
      email: draft.owner.email,
      language: draft.owner.language || 'hi',
      consent: draft.owner.consent,
    },
  });

  const mobile = watch('mobile') ?? '';
  const otpVerified =
    draft.owner.mobileVerified &&
    (!draft.owner.verifiedMobile || draft.owner.verifiedMobile === mobile);

  const goTo = (key: StepKey) => navigate(`/register/${key}`);

  const onSubmit = handleSubmit((values) => {
    // Block Continue only when an OTP was actually sent and not yet confirmed.
    if (!otpVerified && (otpStatus === 'sent' || otpStatus === 'verifying')) {
      toast.error(t('otp.requiredToContinue'));
      return;
    }
    patchDraft((current) => ({
      ...current,
      owner: {
        ...current.owner,
        fullName: values.fullName.trim(),
        mobile: values.mobile.trim(),
        email: values.email.trim(),
        language: values.language,
        consent: values.consent,
        mobileVerified: otpVerified,
        verifiedMobile: otpVerified ? values.mobile.trim() : '',
      },
    }));
    goTo('business');
  });

  const onPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(t('owner.photoTooLarge'));
      event.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      setPhotoError(t('docs.typeError', { name: file.name, max: 5 }));
      event.target.value = '';
      return;
    }
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      patchDraft((current) => ({ ...current, owner: { ...current.owner, photoDataUrl: dataUrl } }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="animate-fade-up rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-7">
      <div>
        <h2 className="text-lg font-bold text-white">{t('register.ownerStep')}</h2>
        <p className="mt-1 text-sm text-muted">{t('register.ownerHint')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        {/* Profile photo */}
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-line bg-ink">
            {draft.owner.photoDataUrl ? (
              <img
                src={draft.owner.photoDataUrl}
                alt={t('owner.photo')}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-muted">
                <Camera size={22} aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-brand/50 hover:text-brand">
              {t('owner.photoUpload')}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onPhotoChange} />
            </label>
            {draft.owner.photoDataUrl && (
              <button
                type="button"
                onClick={() => patchDraft((c) => ({ ...c, owner: { ...c.owner, photoDataUrl: '' } }))}
                className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-danger"
              >
                <X size={13} aria-hidden="true" />
                {t('common.remove')}
              </button>
            )}
            <span className="text-xs text-muted">{t('owner.photoHint')}</span>
          </div>
        </div>
        {photoError && (
          <p role="alert" className="text-xs font-medium text-danger">
            {photoError}
          </p>
        )}

        <FormField
          label={t('owner.fullName')}
          placeholder={t('owner.fullNamePh')}
          autoComplete="name"
          error={errors.fullName?.message}
          required
          {...register('fullName')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label={t('owner.mobile')}
            type="tel"
            inputMode="numeric"
            placeholder="98765 43210"
            autoComplete="tel-national"
            maxLength={10}
            prefix="+91"
            hint={t('owner.mobileHint')}
            error={errors.mobile?.message}
            required
            {...register('mobile')}
          />
          <FormField
            label={t('owner.email')}
            type="email"
            placeholder={t('owner.emailPh')}
            autoComplete="email"
            error={errors.email?.message}
            required
            {...register('email')}
          />
        </div>

        <OtpVerifier
          mobile={mobile}
          verified={otpVerified}
          onStatusChange={setOtpStatus}
          onVerifiedChange={(value) =>
            patchDraft((current) => ({
              ...current,
              owner: {
                ...current.owner,
                mobileVerified: value,
                verifiedMobile: value ? mobile : '',
              },
            }))
          }
        />

        <SelectField
          label={t('owner.language')}
          error={errors.language?.message}
          required
          {...register('language')}
        >
          {LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.nativeName}
            </option>
          ))}
        </SelectField>

        <div className="rounded-xl border border-line bg-ink/50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded border-line bg-ink accent-brand"
              {...register('consent')}
            />
            <span className="text-sm leading-relaxed text-muted">
              {t('owner.consent')}
            </span>
          </label>
          {errors.consent && (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              {errors.consent.message}
            </p>
          )}
        </div>

        <div className={cn('flex flex-col-reverse gap-3 sm:flex-row sm:justify-between')}>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-medium text-muted transition hover:border-line-strong hover:text-white"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden="true" />
            {t('common.back')}
          </button>
          <LoadingButton type="submit" loading={isSubmitting} block={false} className="sm:min-w-44">
            {t('common.continue')}
            <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}

export default OwnerDetailsStep;
