import { useId, useMemo, useState, type FormEvent, type RefObject } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  PRESET_CITIES,
  type AirQualityReading,
  type PresetCity,
  getAqiCategory,
  getAqiCategoryMeta,
  validateAirQualityReading,
} from '../../shared/airQuality.ts';

export type SelectorTab = 'presets' | 'custom';

interface CitySelectorProps {
  activeReading: AirQualityReading;
  activeTab: SelectorTab;
  onTabChange: (tab: SelectorTab) => void;
  onSelectReading: (reading: AirQualityReading) => void;
  customCityInputRef: RefObject<HTMLInputElement | null>;
}

const CATEGORY_TEXT_COLORS: Record<string, string> = {
  Good: 'text-emerald-800',
  Moderate: 'text-amber-800',
  Poor: 'text-orange-800',
  Unhealthy: 'text-red-800',
  Severe: 'text-purple-900',
};

export function CitySelector({
  activeReading,
  activeTab,
  onTabChange,
  onSelectReading,
  customCityInputRef,
}: CitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cityInput, setCityInput] = useState(activeReading.isCustom ? activeReading.city : '');
  const [aqiInput, setAqiInput] = useState(activeReading.isCustom ? String(activeReading.aqi) : '185');
  const [pm25Input, setPm25Input] = useState(activeReading.isCustom ? String(activeReading.pm25) : '92');
  const [pm10Input, setPm10Input] = useState(activeReading.isCustom ? String(activeReading.pm10) : '168');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formSubmittedNotice, setFormSubmittedNotice] = useState<string | null>(null);

  const searchId = useId();
  const cityId = useId();
  const aqiId = useId();
  const pm25Id = useId();
  const pm10Id = useId();

  const filteredPresets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return PRESET_CITIES;
    return PRESET_CITIES.filter((item) => {
      const category = getAqiCategory(item.aqi).toLowerCase();
      return (
        item.city.toLowerCase().includes(query) ||
        item.country.toLowerCase().includes(query) ||
        category.includes(query)
      );
    });
  }, [searchQuery]);

  const liveAqiNumber = Number(aqiInput);
  const hasValidPreviewAqi =
    aqiInput.trim() !== '' &&
    Number.isFinite(liveAqiNumber) &&
    liveAqiNumber >= 0 &&
    liveAqiNumber <= 500;
  const previewMeta = hasValidPreviewAqi ? getAqiCategoryMeta(liveAqiNumber) : null;

  function handlePresetClick(preset: PresetCity) {
    setFormSubmittedNotice(null);
    onSelectReading({
      city: preset.city,
      country: preset.country,
      aqi: preset.aqi,
      pm25: preset.pm25,
      pm10: preset.pm10,
      isCustom: false,
      dominantPollutant: preset.dominantPollutant,
      profileNote: preset.profileNote,
    });
  }

  function handleCustomSubmit(event: FormEvent<HTMLFormElement>) {
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
      setFormSubmittedNotice(null);
      return;
    }

    setFieldErrors({});
    setFormSubmittedNotice(
      `Applied custom reading for ${validation.value.city} (AQI ${validation.value.aqi}).`
    );
    onSelectReading({
      ...validation.value,
      isCustom: true,
      profileNote: 'Custom user-entered particulate sensor reading.',
    });
  }

  function handleResetCustomForm() {
    setCityInput('');
    setAqiInput('185');
    setPm25Input('92');
    setPm10Input('168');
    setFieldErrors({});
    setFormSubmittedNotice(null);
    customCityInputRef.current?.focus();
  }

  return (
    <aside
      aria-label="Location and air quality selector"
      className="w-full shrink-0 lg:w-[340px]"
    >
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Monitoring Station
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Choose a preset city or enter local AQI, PM2.5, and PM10 readings.
          </p>

          <div
            role="tablist"
            aria-label="Input source mode"
            className="mt-4 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'presets'}
              onClick={() => onTabChange('presets')}
              className={`min-h-[38px] cursor-pointer whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                activeTab === 'presets'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Preset Cities
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'custom'}
              onClick={() => onTabChange('custom')}
              className={`inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                activeTab === 'custom'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Custom Input
            </button>
          </div>
        </div>

        {activeTab === 'presets' ? (
          <div role="tabpanel" aria-label="Preset cities">
            <div className="border-b border-slate-200 p-4">
              <label htmlFor={searchId} className="block text-xs font-medium text-slate-700">
                Search cities or severity
              </label>
              <div className="relative mt-1.5">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id={searchId}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Delhi, London, Severe…"
                  className="min-h-[40px] w-full rounded-md border border-slate-300 bg-white py-2 pr-9 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear city search"
                    className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {filteredPresets.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-slate-900">No matching preset city</p>
                <p className="mt-1 text-xs text-slate-600">
                  Switch to Custom Input to analyze "{searchQuery.trim()}" with your own sensor values.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCityInput(searchQuery.trim());
                    onTabChange('custom');
                  }}
                  className="mt-4 inline-flex min-h-[40px] cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  Enter "{searchQuery.trim()}" as Custom City
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200" aria-label="Available preset cities">
                {filteredPresets.map((preset) => {
                  const category = getAqiCategory(preset.aqi);
                  const isSelected =
                    !activeReading.isCustom &&
                    activeReading.city.toLowerCase() === preset.city.toLowerCase();

                  return (
                    <li key={preset.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handlePresetClick(preset)}
                        className={`flex min-h-[60px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-700 ${
                          isSelected
                            ? 'bg-blue-50/70'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900">
                              {preset.city}
                            </span>
                            {isSelected && (
                              <span className="text-xs font-medium text-blue-800">Selected</span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
                            <span className="truncate">{preset.country}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              PM2.5 {preset.pm25}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="font-mono text-base font-semibold tabular-nums text-slate-950">
                            {preset.aqi}
                          </div>
                          <div
                            className={`text-xs font-medium ${CATEGORY_TEXT_COLORS[category] ?? 'text-slate-700'}`}
                          >
                            {category}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <form
            role="tabpanel"
            aria-label="Custom air quality input"
            noValidate
            onSubmit={handleCustomSubmit}
            className="space-y-4 p-4"
          >
            <div>
              <label htmlFor={cityId} className="block text-xs font-medium text-slate-800">
                City or neighborhood name
              </label>
              <input
                ref={customCityInputRef}
                id={cityId}
                type="text"
                value={cityInput}
                onChange={(e) => {
                  setCityInput(e.target.value);
                  if (fieldErrors.city) {
                    setFieldErrors((prev) => ({ ...prev, city: '' }));
                  }
                }}
                placeholder="e.g., Pune, Chicago, Seoul"
                maxLength={80}
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
                  AQI (0–500)
                </label>
                {previewMeta && (
                  <span
                    className={`text-xs font-medium ${CATEGORY_TEXT_COLORS[previewMeta.category]}`}
                  >
                    {previewMeta.category}
                  </span>
                )}
              </div>
              <input
                id={aqiId}
                type="number"
                inputMode="numeric"
                min={0}
                max={500}
                step={1}
                value={aqiInput}
                onChange={(e) => {
                  setAqiInput(e.target.value);
                  if (fieldErrors.aqi) {
                    setFieldErrors((prev) => ({ ...prev, aqi: '' }));
                  }
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
                  min={0}
                  max={1000}
                  step="0.1"
                  value={pm25Input}
                  onChange={(e) => {
                    setPm25Input(e.target.value);
                    if (fieldErrors.pm25) {
                      setFieldErrors((prev) => ({ ...prev, pm25: '' }));
                    }
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
                  <p id={`${pm25Id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-700">
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
                  min={0}
                  max={2000}
                  step="0.1"
                  value={pm10Input}
                  onChange={(e) => {
                    setPm10Input(e.target.value);
                    if (fieldErrors.pm10) {
                      setFieldErrors((prev) => ({ ...prev, pm10: '' }));
                    }
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
                  <p id={`${pm10Id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-700">
                    {fieldErrors.pm10}
                  </p>
                )}
              </div>
            </div>

            {formSubmittedNotice && (
              <p role="status" className="text-xs font-medium text-emerald-800">
                {formSubmittedNotice}
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
                onClick={handleResetCustomForm}
                className="inline-flex min-h-[42px] cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
              >
                Reset
              </button>
            </div>
          </form>
        )}
      </div>
    </aside>
  );
}
