import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Crosshair, MapPin, X } from 'lucide-react';
import { FormField, SelectField } from '../FormField';
import { LoadingButton } from '../LoadingButton';
import { useRegistration } from '../../context/RegistrationContext';
import { useToast } from '../../context/ToastContext';
import { useServerConfig } from '../../lib/serverConfig';
import { INDIAN_STATES } from '../../lib/constants';

export function BusinessLocationStep() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { draft, patchDraft } = useRegistration();
  const { config } = useServerConfig();
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const schema = z.object({
    state: z.string().min(1, t('validate.select')),
    city: z.string().trim().min(1, t('validate.required', { field: t('loc.city') })),
    locality: z.string().trim().min(1, t('validate.required', { field: t('loc.locality') })),
    pincode: z.string().trim().regex(/^\d{6}$/, t('validate.pin')),
    street: z.string().trim().min(1, t('validate.required', { field: t('loc.street') })),
    landmark: z.string().trim().optional(),
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
      state: draft.location.state,
      city: draft.location.city,
      locality: draft.location.locality,
      pincode: draft.location.pincode,
      street: draft.location.street,
      landmark: draft.location.landmark,
    },
  });

  /**
   * Browser geolocation is requested ONLY after this explicit click.
   * No automatic tracking. Coordinates never claim ownership of the address.
   */
  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoError(t('loc.unavailable'));
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        patchDraft((current) => ({
          ...current,
          location: {
            ...current.location,
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          },
        }));
        toast.success(t('loc.coords'));
      },
      (error) => {
        setLocating(false);
        setGeoError(error.code === error.PERMISSION_DENIED ? t('loc.permissionDenied') : t('loc.unavailable'));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const onSubmit = handleSubmit((values) => {
    patchDraft((current) => ({
      ...current,
      location: {
        ...current.location,
        state: values.state,
        city: values.city.trim(),
        locality: values.locality.trim(),
        pincode: values.pincode.trim(),
        street: values.street.trim(),
        landmark: values.landmark?.trim() ?? '',
      },
    }));
    navigate('/register/review');
  });

  return (
    <div className="animate-fade-up rounded-2xl border border-line bg-charcoal/80 p-5 sm:p-7">
      <div>
        <h2 className="text-lg font-bold text-white">{t('register.locationStep')}</h2>
        <p className="mt-1 text-sm text-muted">{t('register.locationHint')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t('loc.country')} value={draft.location.country || 'India'} readOnly className="text-muted" />
          <SelectField
            label={t('loc.state')}
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
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label={t('loc.city')}
            placeholder={t('business.cityPh')}
            error={errors.city?.message}
            required
            {...register('city')}
          />
          <FormField
            label={t('loc.pincode')}
            inputMode="numeric"
            maxLength={6}
            placeholder={t('business.pincodePh')}
            error={errors.pincode?.message}
            required
            {...register('pincode')}
          />
        </div>

        <FormField
          label={t('loc.locality')}
          placeholder={t('business.localityPh')}
          error={errors.locality?.message}
          required
          {...register('locality')}
        />
        <FormField
          label={t('loc.street')}
          placeholder={t('business.streetPh')}
          error={errors.street?.message}
          required
          {...register('street')}
        />
        <FormField
          label={t('loc.landmark')}
          placeholder={t('loc.landmarkPh')}
          error={errors.landmark?.message}
          {...register('landmark')}
        />

        {/* Geolocation — explicit action only */}
        <div className="rounded-xl border border-line bg-ink/50 p-4">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="inline-flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/20 disabled:opacity-60"
          >
            <Crosshair size={16} className={locating ? 'animate-spin' : ''} aria-hidden="true" />
            {locating ? t('loc.locating') : t('loc.useCurrent')}
          </button>

          {geoError && (
            <p role="alert" className="mt-3 text-xs font-medium text-danger">
              {geoError}
            </p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField
              label={`${t('loc.coords')} — LAT`}
              value={draft.location.lat ?? ''}
              readOnly
              placeholder={t('loc.coordsEmpty')}
              className="text-brand"
            />
            <FormField
              label={`${t('loc.coords')} — LNG`}
              value={draft.location.lng ?? ''}
              readOnly
              placeholder={t('loc.coordsEmpty')}
              className="text-brand"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">{t('loc.coordsHint')}</p>
            {(draft.location.lat !== null || draft.location.lng !== null) && (
              <button
                type="button"
                onClick={() =>
                  patchDraft((current) => ({
                    ...current,
                    location: { ...current.location, lat: null, lng: null },
                  }))
                }
                className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-danger"
              >
                <X size={13} aria-hidden="true" />
                {t('loc.clearCoords')}
              </button>
            )}
          </div>

          <p className="mt-3 rounded-lg border border-brand/20 bg-brand/[0.05] px-3 py-2 text-xs leading-relaxed text-brand/85">
            {t('loc.gpsNote')}
          </p>
        </div>

        {/* Honest map placeholder — no fake map without a provider key */}
        <div className="rounded-xl border border-dashed border-line-strong bg-ink/40 p-5 text-center">
          <MapPin size={22} className="mx-auto text-muted" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-white/85">
            {config.map.configured ? `${config.map.provider}` : t('loc.mapPlaceholder')}
          </p>
          <p className="mt-1 text-xs text-muted">{t('loc.manualFallback')}</p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => navigate('/register/documents')}
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

export default BusinessLocationStep;
