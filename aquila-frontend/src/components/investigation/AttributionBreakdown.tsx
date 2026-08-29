import React from "react";
import { Ship, Anchor, AlertTriangle, Navigation, Clock, Activity, ShieldCheck, Map } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface EvidenceFactor {
  id: string;
  name: string;
  score: number; // 0-100 or 0-1 (we'll use 0-100 for display)
  status: "high" | "medium" | "low" | "unknown";
  icon: React.ElementType;
  description: string;
}

interface AttributionBreakdownProps {
  vesselId: string;
  vesselName: string;
  overallScore: number;
  factors: {
    spatial: number;
    temporal: number;
    trajectory: number;
    drift: number;
    behavioural: number;
    aisQuality: number;
  };
  className?: string;
}

export function AttributionBreakdown({
  vesselId,
  vesselName,
  overallScore,
  factors,
  className
}: AttributionBreakdownProps) {
  const evaluateStatus = (score: number): "high" | "medium" | "low" => {
    if (score >= 80) return "high";
    if (score >= 50) return "medium";
    return "low";
  };

  const evidenceFactors: EvidenceFactor[] = [
    {
      id: "spatial",
      name: "Spatial Compatibility",
      score: factors.spatial,
      status: evaluateStatus(factors.spatial),
      icon: Map,
      description: "Overlap between vessel path and slick polygon."
    },
    {
      id: "temporal",
      name: "Temporal Compatibility",
      score: factors.temporal,
      status: evaluateStatus(factors.temporal),
      icon: Clock,
      description: "Time sync between vessel presence and SAR observation."
    },
    {
      id: "trajectory",
      name: "Trajectory Compatibility",
      score: factors.trajectory,
      status: evaluateStatus(factors.trajectory),
      icon: Navigation,
      description: "Alignment of vessel heading with slick morphology."
    },
    {
      id: "drift",
      name: "Drift Compatibility",
      score: factors.drift,
      status: evaluateStatus(factors.drift),
      icon: Anchor, // Using Anchor as a proxy for oceanic/drift
      description: "Hindcast origin match based on OpenDrift model."
    },
    {
      id: "behavioural",
      name: "Behavioural Evidence",
      score: factors.behavioural,
      status: evaluateStatus(factors.behavioural),
      icon: AlertTriangle,
      description: "Anomalous speed drops, course changes, or gaps."
    },
    {
      id: "aisQuality",
      name: "AIS Data Quality",
      score: factors.aisQuality,
      status: evaluateStatus(factors.aisQuality),
      icon: ShieldCheck,
      description: "Reliability and frequency of AIS transponder pings."
    }
  ];

  return (
    <div className={cn("bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-lg p-4", className)}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-on-surface)] flex items-center gap-2">
            <Ship className="w-5 h-5 text-[var(--color-primary)]" />
            {vesselName}
          </h3>
          <p className="text-xs font-mono text-[var(--color-on-surface-variant)]">MMSI: {vesselId}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono text-[var(--color-primary)] font-bold">{overallScore}%</div>
          <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider">Overall Match</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {evidenceFactors.map((factor) => (
          <div key={factor.id} className="bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] rounded p-3 flex flex-col gap-2 relative overflow-hidden group">
            {/* Status indicator bar */}
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1",
              factor.status === "high" ? "bg-[var(--color-primary)]" : 
              factor.status === "medium" ? "bg-[var(--color-tertiary)]" : "bg-[var(--color-error)]"
            )}></div>
            
            <div className="flex justify-between items-center pl-2">
              <div className="flex items-center gap-2">
                <factor.icon className={cn(
                  "w-4 h-4",
                  factor.status === "high" ? "text-[var(--color-primary)]" : 
                  factor.status === "medium" ? "text-[var(--color-tertiary)]" : "text-[var(--color-error)]"
                )} />
                <span className="text-sm font-semibold text-[var(--color-on-surface)]">{factor.name}</span>
              </div>
              <span className="text-xs font-mono font-bold text-[var(--color-on-surface)]">{factor.score}%</span>
            </div>
            
            <p className="text-xs text-[var(--color-on-surface-variant)] pl-2 opacity-80 group-hover:opacity-100 transition-opacity">
              {factor.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
