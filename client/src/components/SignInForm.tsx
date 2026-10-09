import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { FormField } from './FormField';
import { PasswordField } from './PasswordField';
import { LoadingButton } from './LoadingButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { messageFor } from '../lib/errors';

export function SignInForm() {
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z.object({
    identifier: z.string().trim().min(1, t('validate.required', { field: t('auth.identifier') })),
    password: z.string().min(1, t('validate.required', { field: t('auth.password') })),
    remember: z.boolean().optional(),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { identifier: '', password: '' },
  });

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  if (user && user.accountStatus === 'active') return <Navigate to={from} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values.identifier.trim(), values.password, true);
      toast.success(t('auth.signInTitle'));
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(messageFor(t, err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField
        label={t('auth.identifier')}
        placeholder={t('auth.identifierPlaceholder')}
        autoComplete="username"
        error={errors.identifier?.message}
        required
        {...register('identifier')}
      />

      <PasswordField
        label={t('auth.password')}
        placeholder={t('auth.passwordPlaceholder')}
        autoComplete="current-password"
        error={errors.password?.message}
        required
        {...register('password')}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted transition hover:text-white">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line bg-ink accent-brand"
            defaultChecked
            {...register('remember')}
          />
          {t('auth.rememberMe')}
        </label>
        <Link
          to="/forgot-password"
          className="text-sm font-medium text-brand transition hover:text-brand-hover hover:underline"
        >
          {t('auth.forgotPassword')}
        </Link>
      </div>

      {serverError && (
        <div
          role="alert"
          className="animate-fade-in rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {serverError}
        </div>
      )}

      <LoadingButton type="submit" loading={isSubmitting}>
        {isSubmitting ? (
          t('auth.signingIn')
        ) : (
          <span className="inline-flex items-center gap-2">
            <LogIn size={16} aria-hidden="true" />
            {t('auth.signIn')}
          </span>
        )}
      </LoadingButton>
    </form>
  );
}

export default SignInForm;
