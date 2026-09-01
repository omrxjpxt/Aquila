"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { InvestigationSubNav } from "@/components/investigation/InvestigationSubNav";
import { useInvestigation } from "@/contexts/InvestigationContext";

export default function InvestigationLayout(props: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const { loadInvestigation, isLoading, error, scene } = useInvestigation();

  useEffect(() => {
    if (id && id !== scene?.id) {
      loadInvestigation(id);
    }
  }, [id, scene?.id, loadInvestigation]);

  return (
    <div className="flex flex-col h-full w-full bg-surface-lowest">
      <InvestigationSubNav incidentId={id} />
      
      {isLoading && (!scene || scene.id !== id) && (
        <div className="absolute inset-0 z-50 bg-surface-lowest flex items-center justify-center flex-col gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-sm text-on-surface-variant">Loading Investigation: {id}...</p>
        </div>
      )}
      
      {error && (!scene || scene.id !== id) && (
        <div className="absolute inset-0 z-50 bg-surface-lowest flex items-center justify-center flex-col gap-4 p-8 text-center">
          <div className="text-error bg-error/10 p-4 rounded-full">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h2 className="text-lg font-bold">Investigation Not Found</h2>
          <p className="text-sm text-on-surface-variant max-w-md">{error}</p>
          <Link href="/investigation/new" className="mt-4 px-4 py-2 bg-primary text-on-primary rounded font-bold text-xs uppercase tracking-widest">Return to Intake</Link>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        {props.children}
      </div>
    </div>
  );
}
