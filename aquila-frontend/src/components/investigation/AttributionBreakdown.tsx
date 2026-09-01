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
  score: number; // 0-100
  status: "high" | "medium" | "low";
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
      description: "Hindcast origin match based on MockDriftEngine model."
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
    <div className={cn("p-4", className)}>
      <div className="flex justify-between items-center mb-6 hidden">
        {/* Header moved to parent component, hidden here to avoid duplication */}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {evidenceFactors.map((factor) => (
          <div key={factor.id} className="bg-surface border border-outline-variant rounded p-3 flex flex-col gap-2 relative overflow-hidden group shadow-sm hover:border-outline transition-colors">
            {/* Status indicator bar */}
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1",
              factor.status === "high" ? "bg-primary" : 
              factor.status === "medium" ? "bg-tertiary" : "bg-error"
            )}></div>
            
            <div className="flex justify-between items-center pl-2">
              <div className="flex items-center gap-2">
                <factor.icon className={cn(
                  "w-4 h-4",
                  factor.status === "high" ? "text-primary" : 
                  factor.status === "medium" ? "text-tertiary" : "text-error"
                )} />
                <span className="text-sm font-bold text-on-surface">{factor.name}</span>
              </div>
              <span className={cn(
                "text-sm font-mono font-bold",
                factor.status === "high" ? "text-primary" : 
                factor.status === "medium" ? "text-tertiary" : "text-error"
              )}>{factor.score}%</span>
            </div>
            
            <p className="text-[11px] text-on-surface-variant pl-2 leading-tight">
              {factor.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
