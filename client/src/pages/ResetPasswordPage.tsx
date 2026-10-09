import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { LoadingButton } from '../components/LoadingButton';
import { api } from '../lib/api';
import { messageFor } from '../lib/errors';
import { useToast } from '../context/ToastContext';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z
    .object({
      password: z.string().min(8, t('validate.passwordMin')),
      confirm: z.string().min(1, t('validate.required', { field: t('reset.confirmPassword') })),
    })
    .refine((values) => values.password === values.confirm, {
      message: t('validate.mismatch'),
      path: ['confirm'],
    });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await api.post('/api/auth/reset-password', { token, password: values.password });
      toast.success(t('reset.success'));
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(messageFor(t, err));
    }
  });

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-line bg-charcoal/90 p-6 shadow-2xl shadow-black/60 sm:p-8">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand">
              <KeyRound size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">{t('reset.title')}</h2>
              <p className="mt-1 text-sm text-muted">{t('activate.passwordHint')}</p>
            </div>
          </div>

          {!token && (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {t('reset.invalidToken')}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <PasswordField
              label={t('reset.newPassword')}
              autoComplete="new-password"
              error={errors.password?.message}
              required
              {...register('password')}
            />
            <PasswordField
              label={t('reset.confirmPassword')}
              autoComplete="new-password"
              error={errors.confirm?.message}
              required
              {...register('confirm')}
            />

            {serverError && (
              <div role="alert" className="animate-fade-in rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {serverError}
              </div>
            )}

            <LoadingButton type="submit" loading={isSubmitting} disabled={!token}>
              {isSubmitting ? t('reset.submitting') : t('reset.submit')}
            </LoadingButton>
          </form>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand transition hover:text-brand-hover hover:underline"
          >
            {t('forgot.backToSignIn')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
