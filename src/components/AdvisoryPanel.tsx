import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type {
  AdvisoryResponsePayload,
  AirQualityReading,
  SensitiveGroupId,
} from '../../shared/airQuality.ts';

interface AdvisoryPanelProps {
  reading: AirQualityReading;
  advisoryData: AdvisoryResponsePayload | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type GroupFilter = 'all' | SensitiveGroupId;

const SENSITIVE_GROUPS: ReadonlyArray<{
  id: SensitiveGroupId;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'children',
    label: 'Children',
    subtitle: 'Developing lungs and higher outdoor breathing rates',
  },
  {
    id: 'elderly',
    label: 'Older Adults',
    subtitle: 'Higher sensitivity to fine-particle cardiovascular strain',
  },
  {
    id: 'respiratory',
    label: 'Asthma & Respiratory',
    subtitle: 'Asthma, COPD, chronic bronchitis, or airway sensitivity',
  },
];

function AdvisorySkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className={`p-6 ${idx >= 2 ? 'sm:border-t sm:border-slate-200' : ''}`}
          >
            <div className="h-3.5 w-32 rounded bg-slate-200" />
            <div className="mt-3 h-3.5 w-full rounded bg-slate-100" />
            <div className="mt-2 h-3.5 w-5/6 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdvisoryPanel({
  reading,
  advisoryData,
  isLoading,
  error,
  onRefresh,
}: AdvisoryPanelProps) {
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const advisory = advisoryData?.advisory;

  const visibleGroups =
    groupFilter === 'all'
      ? SENSITIVE_GROUPS
      : SENSITIVE_GROUPS.filter((group) => group.id === groupFilter);

  return (
    <div className="space-y-6">
      <section
        id="guidance"
        aria-labelledby="guidance-heading"
        aria-busy={isLoading}
        className="scroll-mt-20 rounded-lg border border-slate-200 bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="guidance-heading"
              className="font-display text-lg font-semibold text-slate-950"
            >
              Outdoor, Commute & Mask Guidance
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span>{reading.city}</span>
              <span aria-hidden="true">·</span>
              <span>
                {isLoading
                  ? 'Updating guidance…'
                  : advisoryData?.source === 'gemini'
                    ? 'Generated with Gemini AI'
                    : advisoryData?.source === 'fallback'
                      ? 'Clinical rule-based fallback'
                      : 'Ready'}
              </span>
              {advisoryData?.cached && !isLoading && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Cached for speed</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isLoading ? 'Generating…' : 'Refresh Guidance'}
          </button>
        </div>

        {advisoryData?.warning && !isLoading && (
          <div
            role="status"
            className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-xs text-amber-950"
          >
            <span className="font-semibold">Fallback advisory active:</span> {advisoryData.warning}
          </div>
        )}

        {error && !isLoading && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-6 py-3 text-xs text-red-950"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={onRefresh}
              className="shrink-0 cursor-pointer whitespace-nowrap rounded border border-red-300 bg-white px-3 py-1.5 font-medium text-red-900 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {isLoading ? (
          <>
            <span className="sr-only" role="status">
              Loading air quality guidance for {reading.city}.
            </span>
            <AdvisorySkeleton />
          </>
        ) : advisory ? (
          <>
            <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-950">Outdoor Activity</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {advisory.outdoorActivity}
                </p>
              </div>

              <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-950">Commute & Transit</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {advisory.commuteGuidance}
                </p>
              </div>

              <div className="border-t border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-950">
                  Mask & Respirator Guidance
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {advisory.maskRecommendation}
                </p>
              </div>

              <div className="border-t border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-950">
                  Indoor Air & Ventilation
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {advisory.indoorAirTips}
                </p>
              </div>
            </div>

            {advisory.actionChecklist.length > 0 && (
              <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-5">
                <h3 className="text-xs font-semibold text-slate-800">
                  Today’s Priority Steps
                </h3>
                <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {advisory.actionChecklist.map((step, index) => (
                    <li
                      key={`${index}-${step.slice(0, 16)}`}
                      className="flex items-start gap-2.5 text-sm leading-snug text-slate-700"
                    >
                      <span className="mt-0.5 shrink-0 font-mono text-xs font-semibold tabular-nums text-blue-800">
                        0{index + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 text-sm text-slate-600">
            Select a city or apply a custom reading to generate guidance.
          </div>
        )}
      </section>

      <section
        id="sensitive-groups"
        aria-labelledby="sensitive-groups-heading"
        aria-busy={isLoading}
        className="scroll-mt-20 rounded-lg border border-slate-200 bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="sensitive-groups-heading"
              className="font-display text-lg font-semibold text-slate-950"
            >
              Tailored Advice for Sensitive Groups
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Specific precautions for children, older adults, and people with asthma or
              respiratory conditions.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter sensitive group view"
            className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1"
          >
            {(
              [
                { id: 'all', label: 'All Groups' },
                { id: 'children', label: 'Children' },
                { id: 'elderly', label: 'Older Adults' },
                { id: 'respiratory', label: 'Asthma & Lungs' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={groupFilter === option.id}
                onClick={() => setGroupFilter(option.id)}
                className={`min-h-[36px] shrink-0 cursor-pointer whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                  groupFilter === option.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div aria-hidden="true" className="grid animate-pulse grid-cols-1 divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="p-6">
                <div className="h-4 w-28 rounded bg-slate-200" />
                <div className="mt-3 h-3.5 w-full rounded bg-slate-100" />
                <div className="mt-2 h-3.5 w-4/5 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : advisory ? (
          <div
            className={`grid grid-cols-1 divide-y divide-slate-200 ${
              visibleGroups.length === 3 ? 'md:grid-cols-3 md:divide-x md:divide-y-0' : ''
            }`}
          >
            {visibleGroups.map((group) => (
              <div key={group.id} className="p-6">
                <h3 className="text-sm font-semibold text-slate-950">{group.label}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{group.subtitle}</p>
                <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-slate-700">
                  {advisory.sensitiveGroups[group.id]}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
