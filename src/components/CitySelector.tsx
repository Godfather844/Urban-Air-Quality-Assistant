import { useState, type RefObject } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { AirQualityReading, PresetCity } from '../../shared/airQuality.ts';
import { CustomReadingForm } from './CustomReadingForm.tsx';
import { PresetCityList } from './PresetCityList.tsx';

export type SelectorTab = 'presets' | 'custom';

interface CitySelectorProps {
  activeReading: AirQualityReading;
  activeTab: SelectorTab;
  onTabChange: (tab: SelectorTab) => void;
  onSelectReading: (reading: AirQualityReading) => void;
  customCityInputRef: RefObject<HTMLInputElement | null>;
}

export function CitySelector({
  activeReading,
  activeTab,
  onTabChange,
  onSelectReading,
  customCityInputRef,
}: CitySelectorProps) {
  const [prefilledCustomCity, setPrefilledCustomCity] = useState('');

  function handleSelectPreset(preset: PresetCity) {
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

  function handleUseSearchAsCustomCity(cityName: string) {
    setPrefilledCustomCity(cityName);
    onTabChange('custom');
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
          <PresetCityList
            activeReading={activeReading}
            onSelectPreset={handleSelectPreset}
            onUseSearchAsCustomCity={handleUseSearchAsCustomCity}
          />
        ) : (
          <CustomReadingForm
            initialCity={prefilledCustomCity}
            activeReading={activeReading}
            cityInputRef={customCityInputRef}
            onApplyReading={onSelectReading}
          />
        )}
      </div>
    </aside>
  );
}
