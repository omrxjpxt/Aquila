"use client";

import { Target, UploadCloud } from "lucide-react";

export default function NewInvestigationPage() {
  return (
    <div className="w-full h-full overflow-y-auto bg-surface p-6 relative z-0">
      <div className="absolute inset-0 pointer-events-none opacity-20 z-[-1]" style={{ backgroundImage: "radial-gradient(var(--color-outline-variant) 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
      
      <div className="max-w-6xl mx-auto flex flex-col h-full">
        
        {/* Page Header */}
        <div className="mb-8 border-b border-outline-variant pb-4 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-on-surface">New Spill Investigation</h2>
            </div>
            <p className="text-sm text-on-surface-variant font-medium max-w-2xl leading-relaxed">Initialize a new geospatial analysis workspace.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 flex-grow items-start pb-8">
          <div className="flex flex-col gap-6">
              <div className="border border-outline-variant bg-surface-container-lowest rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[200px] shadow-sm relative overflow-hidden opacity-50">
                <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 border border-outline-variant">
                  <UploadCloud className="w-8 h-8 text-on-surface-variant" />
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Manual Upload Disabled</h3>
                <p className="text-[11px] text-on-surface-variant mb-4 font-medium max-w-md">Investigations are now automatically created by the Continuous Monitoring Pipeline.</p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
