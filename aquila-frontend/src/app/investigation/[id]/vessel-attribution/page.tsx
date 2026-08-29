import { use } from "react";
import { AttributionBreakdown } from "@/components/investigation/AttributionBreakdown";

export default function VesselAttributionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="p-8 w-full h-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">Vessel Attribution: {id}</h1>
        <p className="text-[var(--color-on-surface-variant)] mt-2">Ranked candidate vessels matrix and 6-factor forensic evidence breakdown.</p>
      </div>

      <div className="max-w-4xl">
        <AttributionBreakdown 
          vesselId="241323000"
          vesselName="OLYMPIC LEADER"
          overallScore={92}
          factors={{
            spatial: 95,
            temporal: 98,
            trajectory: 88,
            drift: 91,
            behavioural: 75,
            aisQuality: 99
          }}
        />
      </div>
    </div>
  );
}
