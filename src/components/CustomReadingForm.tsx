/**
 * @module src/components/CustomReadingForm
 * Validated custom city, AQI, PM2.5, and PM10 sensor input form.
 */
import { useEffect, useId, useState, type FormEvent, type RefObject } from 'react';
import {
  READING_LIMITS,
  type AirQualityReading,
  getAqiCategoryMeta,
  validateAirQualityReading,
} from '../../shared/airQuality.ts';
import { FormField } from './FormField.tsx';

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

/** Renders an accessible form allowing users to analyze custom urban particulate readings. */
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
      <FormField
        id={cityId}
        inputRef={cityInputRef}
        label="City or neighborhood name"
        type="text"
        value={cityInput}
        onChange={(e) => {
          setCityInput(e.target.value);
          clearFieldError('city');
        }}
        placeholder="e.g., Pune, Chicago, Seoul"
        maxLength={READING_LIMITS.cityMaxLength}
        error={fieldErrors.city}
      />

      <FormField
        id={aqiId}
        label={`AQI (${READING_LIMITS.aqiMin}–${READING_LIMITS.aqiMax})`}
        labelAdornment={
          previewMeta ? (
            <span className={`text-xs font-medium ${previewMeta.textClass}`}>
              {previewMeta.category}
            </span>
          ) : null
        }
        type="number"
        inputMode="numeric"
        monospace
        min={READING_LIMITS.aqiMin}
        max={READING_LIMITS.aqiMax}
        step={1}
        value={aqiInput}
        onChange={(e) => {
          setAqiInput(e.target.value);
          clearFieldError('aqi');
        }}
        error={fieldErrors.aqi}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          id={pm25Id}
          label="PM2.5 (µg/m³)"
          type="number"
          inputMode="decimal"
          monospace
          min={READING_LIMITS.pm25Min}
          max={READING_LIMITS.pm25Max}
          step="0.1"
          value={pm25Input}
          onChange={(e) => {
            setPm25Input(e.target.value);
            clearFieldError('pm25');
          }}
          error={fieldErrors.pm25}
        />

        <FormField
          id={pm10Id}
          label="PM10 (µg/m³)"
          type="number"
          inputMode="decimal"
          monospace
          min={READING_LIMITS.pm10Min}
          max={READING_LIMITS.pm10Max}
          step="0.1"
          value={pm10Input}
          onChange={(e) => {
            setPm10Input(e.target.value);
            clearFieldError('pm10');
          }}
          error={fieldErrors.pm10}
        />
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
