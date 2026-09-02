import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface CandidateVesselCardProps {
  rank: number;
  vesselName: string;
  mmsi: string;
  type: string;
  score: number;
  status?: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CandidateVesselCard({
  rank,
  vesselName,
  mmsi,
  type,
  score,
  status,
  isSelected = false,
  onClick,
  className
}: CandidateVesselCardProps) {
  const isTopCandidate = rank === 1;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-all duration-200 group relative overflow-hidden flex flex-col gap-3",
        isSelected 
          ? "bg-primary/5 border-2 border-primary shadow-sm" 
          : "bg-surface border border-outline-variant hover:border-outline shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between w-full gap-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
            isTopCandidate ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant border border-outline-variant"
          )}>
            {rank}
          </div>
          
          <div>
            <h4 className={cn(
              "text-sm font-bold flex items-center gap-1.5",
              isSelected ? "text-primary" : "text-on-surface"
            )}>
              {vesselName}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono font-medium text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded border border-outline-variant">MMSI {mmsi}</span>
              <span className="text-[10px] uppercase text-on-surface-variant font-medium">{type}</span>
            </div>
          </div>
        </div>

        <div className="text-right flex flex-col items-end shrink-0">
          <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-0.5">MATCH</span>
          <span className={cn(
            "text-xl font-mono font-bold leading-none",
            score >= 80 ? "text-primary" : "text-tertiary"
          )}>
            {score.toFixed(0)}%
          </span>
        </div>
      </div>

      {status && (
        <div className={cn(
          "text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded w-fit flex items-center gap-1",
          isTopCandidate 
            ? "bg-primary/10 text-primary border border-primary/20" 
            : "bg-surface-container-high text-on-surface-variant border border-outline-variant"
        )}>
          {isTopCandidate ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {status}
        </div>
      )}
    </div>
  );
}
