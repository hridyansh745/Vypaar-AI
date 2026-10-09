import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { PasswordField } from './PasswordField';
import { LoadingButton } from './LoadingButton';
import { api } from '../lib/api';
import { messageFor } from '../lib/errors';

/** Weak-password checks: no mobile, GSTIN/PAN-like or simple sequences. */
function looksPersonal(value: string): boolean {
  const v = value.toLowerCase();
  if (/^[6-9]\d{9}$/.test(value)) return true; // mobile number
  if (/\d{10,}/.test(value)) return true; // long number runs (GSTIN/PAN fragments)
  if (/(.)\1{3,}/.test(value)) return true; // aaaa
  if (/^(password|passw0rd|qwerty|abcdef|12345678|admin|vyaparai)/.test(v)) return true;
  if (/^(?:0123456789|1234567890|9876543210)/.test(value)) return true;
  return false;
}

export function AccountActivationForm({
  token,
  onSuccess,
}: {
  token: string;
  onSuccess: (user: { userId: string; name?: string }) => void;
}) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z
    .object({
      password: z
        .string()
        .min(8, t('validate.passwordMin'))
        .refine((value) => !looksPersonal(value), { message: t('validate.passwordStrong') }),
      confirm: z.string().min(1, t('validate.required', { field: t('activate.confirmPassword') })),
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
      const res = await api.post<{ user: { userId: string; name?: string } }>(
        '/api/auth/activate-account',
        { token, password: values.password },
      );
      onSuccess(res.user);
    } catch (err) {
      setServerError(messageFor(t, err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <PasswordField
        label={t('activate.createPassword')}
        placeholder="••••••••"
        autoComplete="new-password"
        hint={t('activate.passwordHint')}
        error={errors.password?.message}
        required
        {...register('password')}
      />
      <PasswordField
        label={t('activate.confirmPassword')}
        placeholder="••••••••"
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

      <LoadingButton type="submit" loading={isSubmitting}>
        {isSubmitting ? t('activate.submitting') : t('activate.submit')}
      </LoadingButton>

      <p className="text-center text-xs leading-relaxed text-muted">{t('common.secureNote')}</p>
    </form>
  );
}

export default AccountActivationForm;
