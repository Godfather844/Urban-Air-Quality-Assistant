/**
 * @module src/components/AdvisoryPanel
 * Composes general outdoor/commute/mask guidance with tailored sensitive-group advice.
 */
import type { AdvisoryResponsePayload, AirQualityReading } from '../../shared/airQuality.ts';
import { GuidanceSection } from './GuidanceSection.tsx';
import { SensitiveGroupsSection } from './SensitiveGroupsSection.tsx';

interface AdvisoryPanelProps {
  reading: AirQualityReading;
  advisoryData: AdvisoryResponsePayload | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/** Renders both general and sensitive-group advisory panels for the active reading. */
export function AdvisoryPanel({
  reading,
  advisoryData,
  isLoading,
  error,
  onRefresh,
}: AdvisoryPanelProps) {
  return (
    <div className="space-y-6">
      <GuidanceSection
        reading={reading}
        advisoryData={advisoryData}
        isLoading={isLoading}
        error={error}
        onRefresh={onRefresh}
      />

      <SensitiveGroupsSection
        guidance={advisoryData?.advisory.sensitiveGroups}
        isLoading={isLoading}
      />
    </div>
  );
}
