import { useId, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  PRESET_CITIES,
  type AirQualityReading,
  type PresetCity,
  getAqiCategory,
  getAqiCategoryMeta,
} from '../../shared/airQuality.ts';

interface PresetCityListProps {
  activeReading: AirQualityReading;
  onSelectPreset: (preset: PresetCity) => void;
  onUseSearchAsCustomCity: (cityName: string) => void;
}

export function PresetCityList({
  activeReading,
  onSelectPreset,
  onUseSearchAsCustomCity,
}: PresetCityListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchId = useId();

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

  return (
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
            onClick={() => onUseSearchAsCustomCity(searchQuery.trim())}
            className="mt-4 inline-flex min-h-[40px] cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            Enter "{searchQuery.trim()}" as Custom City
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200" aria-label="Available preset cities">
          {filteredPresets.map((preset) => {
            const meta = getAqiCategoryMeta(preset.aqi);
            const isSelected =
              !activeReading.isCustom &&
              activeReading.city.toLowerCase() === preset.city.toLowerCase();

            return (
              <li key={preset.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectPreset(preset)}
                  className={`flex min-h-[60px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-700 ${
                    isSelected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'
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
                      <span className="font-mono tabular-nums">PM2.5 {preset.pm25}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="font-mono text-base font-semibold tabular-nums text-slate-950">
                      {preset.aqi}
                    </div>
                    <div className={`text-xs font-medium ${meta.textClass}`}>
                      {meta.category}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
