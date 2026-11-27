import { useEffect, useId, useState, type FormEvent, type RefObject } from 'react';
import {
  READING_LIMITS,
  type AirQualityReading,
  getAqiCategoryMeta,
  validateAirQualityReading,
} from '../../shared/airQuality.ts';

interface CustomReadingFormProps {
  initialCity: string;
  activeReading: AirQualityReading;
  cityInputRef: RefObject<HTMLInputElement | null>;
  onApplyReading: (reading: AirQualityReading) => void;
}

const DEFAULT_FORM_VALUES = {
  aqi: '185',
  pm25: '92',
  pm10: '168',
} as const;

export function CustomReadingForm({
  initialCity,
  activeReading,
  cityInputRef,
  onApplyReading,
}: CustomReadingFormProps) {
  const [cityInput, setCityInput] = useState(
    initialCity || (activeReading.isCustom ? activeReading.city : '')
  );
  const [aqiInput, setAqiInput] = useState(
    activeReading.isCustom ? String(activeReading.aqi) : DEFAULT_FORM_VALUES.aqi
  );
  const [pm25Input, setPm25Input] = useState(
    activeReading.isCustom ? String(activeReading.pm25) : DEFAULT_FORM_VALUES.pm25
  );
  const [pm10Input, setPm10Input] = useState(
    activeReading.isCustom ? String(activeReading.pm10) : DEFAULT_FORM_VALUES.pm10
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const cityId = useId();
  const aqiId = useId();
  const pm25Id = useId();
  const pm10Id = useId();

  useEffect(() => {
    if (initialCity) {
      setCityInput(initialCity);
    }
  }, [initialCity]);

  const liveAqiNumber = Number(aqiInput);
  const hasValidPreviewAqi =
    aqiInput.trim() !== '' &&
    Number.isFinite(liveAqiNumber) &&
    liveAqiNumber >= READING_LIMITS.aqiMin &&
    liveAqiNumber <= READING_LIMITS.aqiMax;
  const previewMeta = hasValidPreviewAqi ? getAqiCategoryMeta(liveAqiNumber) : null;

  function clearFieldError(field: string) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateAirQualityReading({
      city: cityInput,
      aqi: aqiInput,
      pm25: pm25Input,
      pm10: pm10Input,
      isCustom: true,
    });

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setSubmittedNotice(null);
      return;
    }

    setFieldErrors({});
    setSubmittedNotice(
      `Applied custom reading for ${validation.value.city} (AQI ${validation.value.aqi}).`
    );
    onApplyReading({
      ...validation.value,
      isCustom: true,
      profileNote: 'Custom user-entered particulate sensor reading.',
    });
  }

  function handleReset() {
    setCityInput('');
    setAqiInput(DEFAULT_FORM_VALUES.aqi);
    setPm25Input(DEFAULT_FORM_VALUES.pm25);
    setPm10Input(DEFAULT_FORM_VALUES.pm10);
    setFieldErrors({});
    setSubmittedNotice(null);
    cityInputRef.current?.focus();
  }

  return (
    <form
      role="tabpanel"
      aria-label="Custom air quality input"
      noValidate
      onSubmit={handleSubmit}
      className="space-y-4 p-4"
    >
      <div>
        <label htmlFor={cityId} className="block text-xs font-medium text-slate-800">
          City or neighborhood name
        </label>
        <input
          ref={cityInputRef}
          id={cityId}
          type="text"
          value={cityInput}
          onChange={(e) => {
            setCityInput(e.target.value);
            clearFieldError('city');
          }}
          placeholder="e.g., Pune, Chicago, Seoul"
          maxLength={READING_LIMITS.cityMaxLength}
          aria-invalid={Boolean(fieldErrors.city)}
          aria-describedby={fieldErrors.city ? `${cityId}-error` : undefined}
          className={`mt-1.5 min-h-[40px] w-full rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
            fieldErrors.city
              ? 'border-red-600 focus:border-red-700 focus:ring-red-700/20'
              : 'border-slate-300 focus:border-blue-700 focus:ring-blue-700/20'
          }`}
        />
        {fieldErrors.city && (
          <p id={`${cityId}-error`} role="alert" className="mt-1 text-xs font-medium text-red-700">
            {fieldErrors.city}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={aqiId} className="block text-xs font-medium text-slate-800">
            AQI ({READING_LIMITS.aqiMin}–{READING_LIMITS.aqiMax})
          </label>
          {previewMeta && (
            <span className={`text-xs font-medium ${previewMeta.textClass}`}>
              {previewMeta.category}
            </span>
          )}
        </div>
        <input
          id={aqiId}
          type="number"
          inputMode="numeric"
          min={READING_LIMITS.aqiMin}
          max={READING_LIMITS.aqiMax}
          step={1}
          value={aqiInput}
          onChange={(e) => {
            setAqiInput(e.target.value);
            clearFieldError('aqi');
          }}
          aria-invalid={Boolean(fieldErrors.aqi)}
          aria-describedby={fieldErrors.aqi ? `${aqiId}-error` : undefined}
          className={`mt-1.5 min-h-[40px] w-full rounded-md border px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:outline-none focus:ring-2 ${
            fieldErrors.aqi
              ? 'border-red-600 focus:border-red-700 focus:ring-red-700/20'
              : 'border-slate-300 focus:border-blue-700 focus:ring-blue-700/20'
          }`}
        />
        {fieldErrors.aqi && (
          <p id={`${aqiId}-error`} role="alert" className="mt-1 text-xs font-medium text-red-700">
            {fieldErrors.aqi}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={pm25Id} className="block text-xs font-medium text-slate-800">
            PM2.5 (µg/m³)
          </label>
          <input
            id={pm25Id}
            type="number"
            inputMode="decimal"
            min={READING_LIMITS.pm25Min}
            max={READING_LIMITS.pm25Max}
            step="0.1"
            value={pm25Input}
            onChange={(e) => {
              setPm25Input(e.target.value);
              clearFieldError('pm25');
            }}
            aria-invalid={Boolean(fieldErrors.pm25)}
            aria-describedby={fieldErrors.pm25 ? `${pm25Id}-error` : undefined}
            className={`mt-1.5 min-h-[40px] w-full rounded-md border px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:outline-none focus:ring-2 ${
              fieldErrors.pm25
                ? 'border-red-600 focus:border-red-700 focus:ring-red-700/20'
                : 'border-slate-300 focus:border-blue-700 focus:ring-blue-700/20'
            }`}
          />
          {fieldErrors.pm25 && (
            <p
              id={`${pm25Id}-error`}
              role="alert"
              className="mt-1 text-xs font-medium text-red-700"
            >
              {fieldErrors.pm25}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={pm10Id} className="block text-xs font-medium text-slate-800">
            PM10 (µg/m³)
          </label>
          <input
            id={pm10Id}
            type="number"
            inputMode="decimal"
            min={READING_LIMITS.pm10Min}
            max={READING_LIMITS.pm10Max}
            step="0.1"
            value={pm10Input}
            onChange={(e) => {
              setPm10Input(e.target.value);
              clearFieldError('pm10');
            }}
            aria-invalid={Boolean(fieldErrors.pm10)}
            aria-describedby={fieldErrors.pm10 ? `${pm10Id}-error` : undefined}
            className={`mt-1.5 min-h-[40px] w-full rounded-md border px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:outline-none focus:ring-2 ${
              fieldErrors.pm10
                ? 'border-red-600 focus:border-red-700 focus:ring-red-700/20'
                : 'border-slate-300 focus:border-blue-700 focus:ring-blue-700/20'
            }`}
          />
          {fieldErrors.pm10 && (
            <p
              id={`${pm10Id}-error`}
              role="alert"
              className="mt-1 text-xs font-medium text-red-700"
            >
              {fieldErrors.pm10}
            </p>
          )}
        </div>
      </div>

      {submittedNotice && (
        <p role="status" className="text-xs font-medium text-emerald-800">
          {submittedNotice}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="inline-flex min-h-[42px] flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        >
          Analyze Reading
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex min-h-[42px] cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
