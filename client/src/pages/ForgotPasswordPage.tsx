import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../components/FormField';
import { LoadingButton } from '../components/LoadingButton';
import { api } from '../lib/api';
import { messageFor } from '../lib/errors';

interface ForgotResponse {
  ok: boolean;
  message?: string;
  demoResetUrl?: string | null;
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState<ForgotResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z.object({
    identifier: z.string().trim().min(1, t('validate.required', { field: t('auth.identifier') })),
  });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { identifier: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const res = await api.post<ForgotResponse>('/api/auth/forgot-password', {
        identifier: values.identifier.trim(),
      });
      setSent(res);
    } catch (err) {
      setServerError(messageFor(t, err));
    }
  });

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-line bg-charcoal/90 p-6 shadow-2xl shadow-black/60 sm:p-8">
        {sent ? (
          <div className="space-y-5 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand">
              <MailCheck size={26} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">{t('forgot.title')}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t('forgot.sent')}</p>
            </div>

            {sent.demoResetUrl && (
              <div className="rounded-xl border border-brand/30 bg-brand/[0.07] p-4 text-start">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  {t('forgot.demoLinkLabel')}
                </p>
                <Link
                  to={sent.demoResetUrl}
                  className="mt-2 block break-all text-sm font-medium text-brand underline decoration-brand/40 underline-offset-2 hover:text-brand-hover"
                >
                  {sent.demoResetUrl}
                </Link>
              </div>
            )}

            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand transition hover:text-brand-hover hover:underline"
            >
              <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
              {t('forgot.backToSignIn')}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">{t('forgot.title')}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t('forgot.desc')}</p>
            </div>

            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <FormField
                label={t('auth.identifier')}
                placeholder={t('auth.identifierPlaceholder')}
                autoComplete="username"
                error={errors.identifier?.message}
                required
                {...register('identifier')}
              />

              {serverError && (
                <div role="alert" className="animate-fade-in rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {serverError}
                </div>
              )}

              <LoadingButton type="submit" loading={isSubmitting}>
                {isSubmitting ? t('forgot.submitting') : t('forgot.submit')}
              </LoadingButton>
            </form>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand transition hover:text-brand-hover hover:underline"
            >
              <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
              {t('forgot.backToSignIn')}
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
