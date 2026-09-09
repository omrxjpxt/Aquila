"use client";

import Link from "next/link";
import { Ship, ChevronLeft } from "lucide-react";
import { use } from "react";

export default function VesselDetailsPage({ params }: { params: Promise<{ mmsi: string }> }) {
  const { mmsi } = use(params);

  return (
    <div className="flex-1 h-full relative overflow-y-auto bg-surface-lowest">
      
      {/* Top Banner */}
      <div className="bg-surface-container-lowest border-b border-outline-variant sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/vessels" className="p-2 -ml-2 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Ship className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-on-surface leading-tight tracking-tight">Vessel Details</h1>
                <div className="font-mono text-[11px] text-on-surface-variant font-medium tracking-wider uppercase mt-0.5">
                  MMSI: {mmsi}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-8">
        <div className="bg-surface border border-outline-variant p-8 rounded text-center text-on-surface-variant">
          <p>Global vessel lookup is currently disabled.</p>
          <p className="text-sm mt-2">Vessels are tracked and evaluated dynamically within active investigations.</p>
        </div>
      </div>
    </div>
  );
}
