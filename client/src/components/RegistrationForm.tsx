import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { FormField } from './FormField';
import { LoadingButton } from './LoadingButton';
import { useRegistration } from '../context/RegistrationContext';

/**
 * "Create Account" tab: does NOT create an approved account.
 * It collects starter details and guides the user into the business
 * registration wizard, which is the real path to an activated login.
 */
export function RegistrationForm({ onNavigateToSignIn }: { onNavigateToSignIn?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { patchDraft, draft } = useRegistration();

  const schema = z.object({
    remember: z.boolean().optional(),
    fullName: z.string().trim().min(1, t('validate.required', { field: t('owner.fullName') })),
    email: z
      .string()
      .trim()
      .min(1, t('validate.required', { field: t('owner.email') }))
      .email(t('validate.email')),
    mobile: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, t('validate.mobile')),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      fullName: draft.owner.fullName,
      email: draft.owner.email,
      mobile: draft.owner.mobile,
    },
  });

  const onSubmit = handleSubmit((values) => {
    patchDraft((current) => ({
      ...current,
      owner: { ...current.owner, fullName: values.fullName.trim(), email: values.email.trim(), mobile: values.mobile.trim() },
    }));
    navigate('/register/owner');
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] p-4">
        <FileText size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-white/85">{t('auth.createAccountNote')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField
          label={t('owner.fullName')}
          placeholder={t('owner.fullNamePh')}
          autoComplete="name"
          error={errors.fullName?.message}
          required
          {...register('fullName')}
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
        <FormField
          label={t('owner.mobile')}
          type="tel"
          inputMode="numeric"
          placeholder="98765 43210"
          autoComplete="tel-national"
          error={errors.mobile?.message}
          required
          prefix="+91"
          {...register('mobile')}
        />

        <LoadingButton type="submit" loading={isSubmitting}>
          <span className="inline-flex items-center gap-2">
            {t('auth.startRegistration')}
            <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
          </span>
        </LoadingButton>
      </form>

      <p className="text-center text-sm text-muted">
        {t('auth.haveAccount')}{' '}
        <button
          type="button"
          onClick={onNavigateToSignIn}
          className="font-medium text-brand transition hover:text-brand-hover hover:underline"
        >
          {t('auth.signIn')}
        </button>
      </p>
    </div>
  );
}

export default RegistrationForm;
