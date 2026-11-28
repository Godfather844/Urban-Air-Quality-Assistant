/**
 * @module src/components/SensitiveGroupsSection
 * Filterable guidance panel tailored for children, older adults, and people
 * with asthma or chronic respiratory conditions.
 */
import { useState } from 'react';
import type { SensitiveGroupGuidance, SensitiveGroupId } from '../../shared/airQuality.ts';

interface SensitiveGroupsSectionProps {
  guidance?: SensitiveGroupGuidance;
  isLoading: boolean;
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

const FILTER_OPTIONS: ReadonlyArray<{ id: GroupFilter; label: string }> = [
  { id: 'all', label: 'All Groups' },
  { id: 'children', label: 'Children' },
  { id: 'elderly', label: 'Older Adults' },
  { id: 'respiratory', label: 'Asthma & Lungs' },
];

/** Renders the tailored sensitive-group precautions section with an accessible view filter. */
export function SensitiveGroupsSection({ guidance, isLoading }: SensitiveGroupsSectionProps) {
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');

  const visibleGroups =
    groupFilter === 'all'
      ? SENSITIVE_GROUPS
      : SENSITIVE_GROUPS.filter((group) => group.id === groupFilter);

  return (
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
            Specific precautions for children, older adults, and people with asthma or respiratory
            conditions.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter sensitive group view"
          className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1"
        >
          {FILTER_OPTIONS.map((option) => (
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
        <div
          aria-hidden="true"
          className="grid animate-pulse grid-cols-1 divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0"
        >
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="p-6">
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="mt-3 h-3.5 w-full rounded bg-slate-100" />
              <div className="mt-2 h-3.5 w-4/5 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : guidance ? (
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
                {guidance[group.id]}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
