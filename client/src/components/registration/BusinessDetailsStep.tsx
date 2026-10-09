import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { FormField, SelectField, CheckboxField } from '../FormField';
import { LoadingButton } from '../LoadingButton';
import { useRegistration } from '../../context/RegistrationContext';
import { INDIAN_STATES } from '../../lib/constants';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function BusinessDetailsStep() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { draft, patchDraft } = useRegistration();

  const schema = z
    .object({
      displayName: z.string().trim().min(1, t('validate.required', { field: t('business.displayName') })),
      legalName: z.string().trim().optional(),
      category: z.string().min(1, t('validate.select')),
      type: z.string().min(1, t('validate.select')),
      structure: z.string().min(1, t('validate.select')),
      gstStatus: z.string().min(1, t('validate.select')),
      gstin: z.string().trim().optional(),
      licenseType: z.string().optional(),
      licenseNumber: z.string().trim().optional(),
      sameAsOwner: z.boolean(),
      contactEmail: z.string().trim().optional(),
      contactPhone: z.string().trim().optional(),
      state: z.string().min(1, t('validate.select')),
      city: z.string().trim().min(1, t('validate.required', { field: t('business.city') })),
      locality: z.string().trim().min(1, t('validate.required', { field: t('business.locality') })),
      pincode: z.string().trim().regex(/^\d{6}$/, t('validate.pin')),
      street: z.string().trim().min(1, t('validate.required', { field: t('business.street') })),
    })
    .superRefine((values, ctx) => {
      // GSTIN only when the business is GST registered — never forced otherwise.
      if (values.gstStatus === 'registered') {
        if (!values.gstin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['gstin'],
            message: t('business.requiredWhenRegistered'),
          });
        } else if (!GSTIN_PATTERN.test(values.gstin.toUpperCase())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['gstin'],
            message: t('business.gstinInvalid'),
          });
        }
      }
      if (!values.sameAsOwner) {
        if (!values.contactEmail) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['contactEmail'],
            message: t('validate.required', { field: t('business.contactEmail') }),
          });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['contactEmail'],
            message: t('validate.email'),
          });
        }
        if (!values.contactPhone) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['contactPhone'],
            message: t('validate.required', { field: t('business.contactPhone') }),
          });
        } else if (!/^[6-9]\d{9}$/.test(values.contactPhone.replace(/\s/g, ''))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['contactPhone'],
            message: t('validate.mobile'),
          });
        }
      }
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
      displayName: draft.business.displayName,
      legalName: draft.business.legalName,
      category: draft.business.category,
      type: draft.business.type,
      structure: draft.business.structure,
      gstStatus: draft.business.gstStatus,
      gstin: draft.business.gstin,
      licenseType: draft.business.licenseType,
      licenseNumber: draft.business.licenseNumber,
      sameAsOwner: draft.business.sameAsOwner,
      contactEmail: draft.business.contactEmail,
      contactPhone: draft.business.contactPhone,
      state: draft.location.state,
      city: draft.location.city,
      locality: draft.location.locality,
      pincode: draft.location.pincode,
      street: draft.location.street,
    },
  });

  const gstStatus = watch('gstStatus');
  const sameAsOwner = watch('sameAsOwner');

  const onSubmit = handleSubmit((values) => {
    patchDraft((current) => ({
      ...current,
      business: {
        ...current.business,
        displayName: values.displayName.trim(),
        legalName: values.legalName?.trim() ?? '',
        category: values.category,
        type: values.type,
        structure: values.structure,
        gstStatus: values.gstStatus,
        gstin: values.gstStatus === 'registered' ? (values.gstin ?? '').toUpperCase() : '',
        licenseType: values.licenseType ?? '',
        licenseNumber: values.licenseNumber?.trim() ?? '',
        sameAsOwner: values.sameAsOwner,
        contactEmail: values.sameAsOwner ? '' : (values.contactEmail ?? '').trim(),
        contactPhone: values.sameAsOwner ? '' : (values.contactPhone ?? '').trim(),
      },
      location: {
        ...current.location,
        state: values.state,
        city: values.city.trim(),
        locality: values.locality.trim(),
        pincode: values.pincode.trim(),
        street: values.street.trim(),
      },
    }));
    navigate('/register/documents');
  });

  return (
    <div className="animate-fade-up rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-7">
      <div>
        <h2 className="text-lg font-bold text-white">{t('register.businessStep')}</h2>
        <p className="mt-1 text-sm text-muted">{t('register.businessHint')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <FormField
          label={t('business.displayName')}
          placeholder={t('business.displayNamePh')}
          error={errors.displayName?.message}
          required
          {...register('displayName')}
        />

        <FormField
          label={`${t('business.legalName')} (${t('common.optional')})`}
          placeholder={t('business.legalNamePh')}
          error={errors.legalName?.message}
          {...register('legalName')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label={t('business.category')}
            placeholder={t('business.categoryPh')}
            error={errors.category?.message}
            required
            {...register('category')}
          >
            {(['grocery', 'apparel', 'electronics', 'food', 'hardware', 'pharmacy', 'agriculture', 'services', 'other'] as const).map(
              (key) => (
                <option key={key} value={key}>
                  {t(`business.categories.${key}`)}
                </option>
              ),
            )}
          </SelectField>

          <SelectField
            label={t('business.type')}
            error={errors.type?.message}
            required
            {...register('type')}
          >
            {(['retail', 'wholesale', 'manufacturing', 'services', 'online', 'other'] as const).map((key) => (
              <option key={key} value={key}>
                {t(`business.types.${key}`)}
              </option>
            ))}
          </SelectField>
        </div>

        <SelectField
          label={t('business.structure')}
          error={errors.structure?.message}
          required
          {...register('structure')}
        >
          {(['proprietorship', 'partnership', 'llp', 'company', 'other'] as const).map((key) => (
            <option key={key} value={key}>
              {t(`business.structures.${key}`)}
            </option>
          ))}
        </SelectField>

        {watch('type') === 'online' && (
          <p className="flex items-start gap-2 rounded-xl border border-brand/25 bg-brand/[0.06] px-4 py-3 text-xs leading-relaxed text-brand/90">
            <Info size={15} className="mt-px shrink-0" aria-hidden="true" />
            {t('business.onlineNote')}
          </p>
        )}

        {/* GST */}
        <SelectField
          label={t('business.gstStatus')}
          error={errors.gstStatus?.message}
          required
          {...register('gstStatus')}
        >
          <option value="">{t('business.gstStatus')}</option>
          <option value="registered">{t('business.gst.registered')}</option>
          <option value="notRegistered">{t('business.gst.notRegistered')}</option>
          <option value="notApplicable">{t('business.gst.notApplicable')}</option>
        </SelectField>

        {gstStatus === 'registered' && (
          <FormField
            label={t('business.gstin')}
            placeholder="09ABCDE1234F1Z5"
            maxLength={15}
            autoCapitalize="characters"
            hint={t('business.gstinHint')}
            error={errors.gstin?.message}
            required
            className="uppercase"
            {...register('gstin')}
          />
        )}
        {gstStatus === 'notApplicable' && (
          <p className="text-xs text-muted">{t('business.gstinHiddenNote')}</p>
        )}

        {/* Licences (optional) */}
        <div className="rounded-xl border border-line bg-ink/40 p-4">
          <p className="text-sm font-semibold text-white/90">{t('business.licenseSection')}</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            <SelectField label={t('business.licenseType')} {...register('licenseType')}>
              <option value="">{t('common.optional')}</option>
              {(['shopEstablishment', 'udyam', 'fssai', 'trade', 'other'] as const).map((key) => (
                <option key={key} value={key}>
                  {t(`business.licenseTypes.${key}`)}
                </option>
              ))}
            </SelectField>
            <FormField
              label={t('business.licenseNumber')}
              placeholder={t('business.licenseNumberPh')}
              error={errors.licenseNumber?.message}
              {...register('licenseNumber')}
            />
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-xl border border-line bg-ink/40 p-4">
          <p className="text-sm font-semibold text-white/90">{t('business.contactSection')}</p>
          <div className="mt-3">
            <CheckboxField
              label={t('business.sameAsOwner')}
              {...register('sameAsOwner')}
            />
          </div>
          {!sameAsOwner && (
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <FormField
                label={t('business.contactEmail')}
                type="email"
                placeholder={t('owner.emailPh')}
                error={errors.contactEmail?.message}
                required
                {...register('contactEmail')}
              />
              <FormField
                label={t('business.contactPhone')}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                prefix="+91"
                placeholder="98765 43210"
                error={errors.contactPhone?.message}
                required
                {...register('contactPhone')}
              />
            </div>
          )}
        </div>

        {/* Address (shared with location step) */}
        <div className="rounded-xl border border-line bg-ink/40 p-4">
          <p className="text-sm font-semibold text-white/90">{t('business.addressSection')}</p>
          <div className="mt-4 space-y-5">
            <SelectField
              label={t('business.state')}
              placeholder={t('business.statePh')}
              error={errors.state?.message}
              required
              {...register('state')}
            >
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </SelectField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label={t('business.city')}
                placeholder={t('business.cityPh')}
                error={errors.city?.message}
                required
                {...register('city')}
              />
              <FormField
                label={t('business.pincode')}
                inputMode="numeric"
                maxLength={6}
                placeholder={t('business.pincodePh')}
                error={errors.pincode?.message}
                required
                {...register('pincode')}
              />
            </div>
            <FormField
              label={t('business.locality')}
              placeholder={t('business.localityPh')}
              error={errors.locality?.message}
              required
              {...register('locality')}
            />
            <FormField
              label={t('business.street')}
              placeholder={t('business.streetPh')}
              error={errors.street?.message}
              required
              {...register('street')}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => navigate('/register/owner')}
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

export default BusinessDetailsStep;
