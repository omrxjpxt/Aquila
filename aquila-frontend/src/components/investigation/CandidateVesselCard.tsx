import React from "react";
import { Ship, Navigation2, Crosshair } from "lucide-react";
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
  isSelected = false,
  onClick,
  className
}: CandidateVesselCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-3 border rounded-lg cursor-pointer transition-all duration-200 group relative overflow-hidden flex items-center justify-between",
        isSelected 
          ? "bg-[var(--color-surface-high)] border-[var(--color-primary)] shadow-[0_0_15px_rgba(84,227,246,0.15)]" 
          : "bg-[var(--color-surface)] border-[var(--color-outline-variant)] hover:border-[var(--color-outline)]",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono",
          rank === 1 ? "bg-[var(--color-primary-container)] text-[var(--color-background)]" : "bg-[var(--color-surface-lowest)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)]"
        )}>
          {rank}
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-on-surface)] flex items-center gap-1.5">
            {vesselName}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-[var(--color-on-surface-variant)]">MMSI {mmsi}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--color-outline-variant)]"></span>
            <span className="text-[10px] uppercase text-[var(--color-on-surface-variant)]">{type}</span>
          </div>
        </div>
      </div>

      <div className="text-right flex flex-col items-end justify-center">
        <span className={cn(
          "text-lg font-mono font-bold",
          score > 80 ? "text-[var(--color-primary)]" : "text-[var(--color-tertiary)]"
        )}>
          {score}%
        </span>
      </div>

      {/* Decorative overlay when selected */}
      {isSelected && (
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--color-primary)]/10 to-transparent pointer-events-none"></div>
      )}
    </div>
  );
}
