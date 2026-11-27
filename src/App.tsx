import { useRef, useState } from 'react';
import {
  PRESET_CITIES,
  type AirQualityReading,
  WHO_24H_GUIDELINES,
} from '../shared/airQuality.ts';
import { AdvisoryPanel } from './components/AdvisoryPanel.tsx';
import { AqiOverview } from './components/AqiOverview.tsx';
import { CitySelector, type SelectorTab } from './components/CitySelector.tsx';
import { Header } from './components/Header.tsx';
import { QaAssistant } from './components/QaAssistant.tsx';
import { useAdvisory } from './hooks/useAdvisory.ts';

const INITIAL_READING: AirQualityReading = {
  city: PRESET_CITIES[0].city,
  country: PRESET_CITIES[0].country,
  aqi: PRESET_CITIES[0].aqi,
  pm25: PRESET_CITIES[0].pm25,
  pm10: PRESET_CITIES[0].pm10,
  isCustom: false,
  dominantPollutant: PRESET_CITIES[0].dominantPollutant,
  profileNote: PRESET_CITIES[0].profileNote,
};

export default function App() {
  const [activeReading, setActiveReading] = useState<AirQualityReading>(INITIAL_READING);
  const [selectorTab, setSelectorTab] = useState<SelectorTab>('presets');
  const customCityInputRef = useRef<HTMLInputElement | null>(null);

  const { advisoryData, isLoading, error, refresh } = useAdvisory(activeReading);

  function handleOpenCustomInput() {
    setSelectorTab('custom');
    window.setTimeout(() => {
      customCityInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      customCityInputRef.current?.focus();
    }, 50);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header onOpenCustomInput={handleOpenCustomInput} />

      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      >
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:gap-8">
          <CitySelector
            activeReading={activeReading}
            activeTab={selectorTab}
            onTabChange={setSelectorTab}
            onSelectReading={setActiveReading}
            customCityInputRef={customCityInputRef}
          />

          <div className="w-full min-w-0 flex-1 space-y-6">
            <AqiOverview
              reading={activeReading}
              aiSummary={advisoryData?.advisory.summary}
            />

            <AdvisoryPanel
              reading={activeReading}
              advisoryData={advisoryData}
              isLoading={isLoading}
              error={error}
              onRefresh={refresh}
            />

            <QaAssistant reading={activeReading} />
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 py-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>
            Urban Air Quality Assistant · Informational health guidance only; consult a licensed
            clinician for medical advice.
          </p>
          <p className="font-mono tabular-nums text-slate-500">
            WHO 24h reference: PM2.5 {WHO_24H_GUIDELINES.pm25} µg/m³ · PM10{' '}
            {WHO_24H_GUIDELINES.pm10} µg/m³
          </p>
        </div>
      </footer>
    </div>
  );
}
