import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
} from 'lucide-react';
import {
  AQI_SCALE_BANDS,
  WHO_24H_GUIDELINES,
  type AirQualityReading,
  type AqiCategory,
  getAqiCategoryMeta,
  getAqiScalePosition,
  getWhoGuidelineMultiplier,
} from '../../shared/airQuality.ts';

interface AqiOverviewProps {
  reading: AirQualityReading;
  aiSummary?: string;
}

function CategoryGlyph({ category }: { category: AqiCategory }) {
  const iconClass = 'h-4 w-4 shrink-0';
  switch (category) {
    case 'Good':
      return <CheckCircle2 className={iconClass} aria-hidden="true" />;
    case 'Moderate':
      return <Info className={iconClass} aria-hidden="true" />;
    case 'Poor':
      return <AlertTriangle className={iconClass} aria-hidden="true" />;
    case 'Unhealthy':
      return <AlertOctagon className={iconClass} aria-hidden="true" />;
    case 'Severe':
      return <ShieldAlert className={iconClass} aria-hidden="true" />;
  }
}

export function AqiOverview({ reading, aiSummary }: AqiOverviewProps) {
  const meta = getAqiCategoryMeta(reading.aqi);
  const scalePercent = getAqiScalePosition(reading.aqi);
  const pm25Multiplier = getWhoGuidelineMultiplier(reading.pm25, WHO_24H_GUIDELINES.pm25);
  const pm10Multiplier = getWhoGuidelineMultiplier(reading.pm10, WHO_24H_GUIDELINES.pm10);

  return (
    <section
      id="overview"
      aria-labelledby="overview-heading"
      className="scroll-mt-20 rounded-lg border border-slate-200 bg-white"
    >
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1
              id="overview-heading"
              className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
            >
              {reading.city}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {reading.country && <span>{reading.country}</span>}
              {reading.country && <span aria-hidden="true">·</span>}
              <span>{reading.isCustom ? 'Custom sensor reading' : 'Reference urban profile'}</span>
              {reading.dominantPollutant && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Dominant pollutant: {reading.dominantPollutant}</span>
                </>
              )}
            </div>
          </div>

          <div
            role="status"
            aria-label={`Air Quality Category: ${meta.category}, ${meta.rangeLabel}`}
            className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold whitespace-nowrap ${meta.badgeClasses}`}
          >
            <CategoryGlyph category={meta.category} />
            <span>{meta.category}</span>
            <span className="font-mono text-xs font-medium opacity-80">({meta.rangeLabel})</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 items-end gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="text-xs font-medium text-slate-600">Air Quality Index</div>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className="font-mono text-5xl font-semibold tracking-tight tabular-nums text-slate-950 sm:text-6xl">
                {reading.aqi}
              </span>
              <span className="font-mono text-xs font-medium text-slate-500">AQI / 500</span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-slate-800">{meta.shortRisk}</p>
          </div>

          <div className="lg:col-span-8">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium text-slate-800">AQI Severity Scale</span>
              <span className="font-mono tabular-nums">
                Position: {reading.aqi} ({meta.category})
              </span>
            </div>

            <div
              role="meter"
              aria-label="Air Quality Index severity meter"
              aria-valuemin={0}
              aria-valuemax={500}
              aria-valuenow={reading.aqi}
              aria-valuetext={`${reading.aqi} AQI, ${meta.category} — ${meta.shortRisk}`}
              className="relative mt-3 pt-2 pb-1"
            >
              <div className="flex h-3 w-full overflow-hidden rounded-sm bg-slate-200">
                {AQI_SCALE_BANDS.map((band) => (
                  <div
                    key={band.category}
                    style={{
                      width: `${band.widthPercent}%`,
                      backgroundColor: band.barColor,
                    }}
                    className="h-full border-r border-white/50 last:border-r-0"
                  />
                ))}
              </div>

              <div
                style={{ left: `${scalePercent}%` }}
                aria-hidden="true"
                className="absolute top-0 -translate-x-1/2 transition-transform duration-200"
              >
                <div className="h-7 w-1 rounded-full bg-slate-950 ring-2 ring-white" />
              </div>
            </div>

            <div className="mt-2 grid grid-cols-5 text-[11px] text-slate-600">
              <span>Good (0–50)</span>
              <span>Moderate (51–100)</span>
              <span>Poor (101–200)</span>
              <span>Unhealthy (201–300)</span>
              <span className="text-right">Severe (301+)</span>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <h2 className="text-xs font-semibold text-slate-700">Health Risk Summary</h2>
          <p className="mt-1.5 max-w-[74ch] text-sm leading-relaxed text-slate-700">
            {aiSummary || meta.healthSummary}
          </p>
          {reading.profileNote && (
            <p className="mt-2 text-xs text-slate-500">{reading.profileNote}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-200 border-t border-slate-200 bg-slate-50/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-600">PM2.5 Fine Particulates</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-950">
              {reading.pm25}
            </span>
            <span className="font-mono text-xs text-slate-500">µg/m³</span>
          </div>
          <p className="mt-1 font-mono text-xs tabular-nums text-slate-600">
            {reading.pm25 <= WHO_24H_GUIDELINES.pm25
              ? `Within WHO 24h limit (${WHO_24H_GUIDELINES.pm25} µg/m³)`
              : `${pm25Multiplier}× WHO 24h limit (${WHO_24H_GUIDELINES.pm25} µg/m³)`}
          </p>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-600">PM10 Coarse Particulates</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-950">
              {reading.pm10}
            </span>
            <span className="font-mono text-xs text-slate-500">µg/m³</span>
          </div>
          <p className="mt-1 font-mono text-xs tabular-nums text-slate-600">
            {reading.pm10 <= WHO_24H_GUIDELINES.pm10
              ? `Within WHO 24h limit (${WHO_24H_GUIDELINES.pm10} µg/m³)`
              : `${pm10Multiplier}× WHO 24h limit (${WHO_24H_GUIDELINES.pm10} µg/m³)`}
          </p>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-600">Baseline Precaution</div>
          <div className="mt-1.5 text-sm font-semibold text-slate-950">{meta.maskHeadline}</div>
          <p className="mt-1 text-xs text-slate-600">{meta.outdoorHeadline}</p>
        </div>
      </div>
    </section>
  );
}
