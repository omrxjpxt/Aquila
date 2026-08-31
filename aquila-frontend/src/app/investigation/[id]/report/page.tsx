"use client";

import { use } from "react";
import { FileText, Share2, Save, AlertTriangle, Image as ImageIcon, Crosshair, HelpCircle, Wind, Anchor, Search, Database, Clock, ListChecks, Info, RadioTower, Satellite } from "lucide-react";
import { mockIncident } from "@/lib/mockData";

export default function InvestigationReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const incident = mockIncident;

  const topCandidate = incident.vesselCandidates.find(c => c.status === "Highest-Ranked Candidate") || incident.vesselCandidates[0];

  return (
    <div className="flex-1 p-6 flex justify-center overflow-y-auto h-full bg-[#eef4f8]">
      
      {/* Report Container */}
      <div className="w-full max-w-5xl bg-surface border border-outline-variant shadow-sm p-8 rounded-lg relative overflow-hidden mb-16">
        
        {/* Atmospheric Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"></div>
        
        {/* Report Header */}
        <header className="flex flex-col md:flex-row justify-between items-start border-b border-outline-variant pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">AQUILA</h1>
            <h2 className="text-xl font-bold text-on-surface uppercase tracking-wide">MARITIME POLLUTION INVESTIGATION REPORT</h2>
            <p className="font-mono text-xs font-bold text-on-surface-variant mt-2 tracking-wider">REF: {incident.id} | GEN: {new Date().toISOString().split('T')[0]}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary border border-primary/20 transition-colors px-4 py-2 rounded flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase shadow-sm">
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <button className="bg-surface text-on-surface hover:text-primary hover:border-primary border border-outline-variant transition-colors px-4 py-2 rounded flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase shadow-sm">
              <Share2 className="w-4 h-4" />
              Share Report
            </button>
            <button className="bg-surface text-on-surface hover:text-primary hover:border-primary border border-outline-variant transition-colors px-4 py-2 rounded flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase shadow-sm">
              <Save className="w-4 h-4" />
              Save Report
            </button>
          </div>
        </header>

        {/* Incident Metrics Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8 bg-surface-container-lowest border-y border-outline-variant py-4 px-2">
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Incident ID</span>
            <span className="font-mono text-xs font-bold text-on-surface">{incident.id}</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Detection Time</span>
            <span className="font-mono text-xs font-bold text-on-surface">{new Date(incident.incident.initialDetectionTime).toISOString().slice(11,16)}Z</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Location</span>
            <span className="font-mono text-xs font-bold text-on-surface">{incident.incident.centerCoord[1].toFixed(1)}°N, {incident.incident.centerCoord[0].toFixed(1)}°E</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Spill Area</span>
            <span className="font-mono text-xs font-bold text-on-surface">{incident.slick.surfaceAreaKm2} km²</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Assessment</span>
            <span className="font-mono text-xs font-bold text-primary">{incident.lookAlikeAssessment.confidence}</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Data Quality</span>
            <span className="font-mono text-xs font-bold text-primary">{incident.satellite.dataQuality}</span>
          </div>
          <div className="flex flex-col px-2 border-l border-outline-variant pl-4">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Top Candidate</span>
            <span className="font-mono text-xs font-bold text-error">MMSI {topCandidate.mmsi}</span>
          </div>
        </div>

        {/* 1. Incident Summary */}
        <section className="mb-10 bg-surface border border-outline-variant p-6 rounded shadow-sm">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-outline-variant pb-2">
            <AlertTriangle className="w-4 h-4" /> 1. Incident Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col bg-surface-container-lowest border border-outline-variant p-3 rounded">
              <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">Status</span>
              <div className="font-mono text-xs font-bold text-on-surface flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary shadow-sm"></span>
                ACTIVE INVESTIGATION
              </div>
            </div>
            <div className="flex flex-col bg-surface-container-lowest border border-outline-variant p-3 rounded">
              <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">Priority</span>
              <div className="font-mono text-xs font-bold text-error flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                {incident.priority}
              </div>
            </div>
            <div className="flex flex-col bg-surface-container-lowest border border-outline-variant p-3 rounded">
              <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">Oil Classification</span>
              <div className="font-mono text-xs font-bold text-on-surface">
                {incident.slick.classification}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-6 leading-relaxed font-medium">
            On {new Date(incident.incident.initialDetectionTime).toISOString().slice(0, 19)}Z, the AQUILA autonomous detection pipeline identified a major surface anomaly spanning {incident.slick.surfaceAreaKm2} km² in the vicinity of {incident.incident.centerCoord[1].toFixed(2)}°N, {incident.incident.centerCoord[0].toFixed(2)}°E. The morphological characteristics and SVM classification strongly indicate an anthropogenic origin, specifically consistent with {incident.slick.classification.toLowerCase()}. Natural biofilm and biogenic look-alikes have been eliminated from the candidate hypothesis space.
          </p>
        </section>

        {/* 2. Source Attribution */}
        <section className="mb-10">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-outline-variant pb-2">
            <Search className="w-4 h-4" /> 2. Source Attribution & Candidate Analysis
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-surface border border-outline-variant p-6 rounded shadow-sm">
              <h4 className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-4 pb-2 border-b border-outline-variant">Highest-Ranked Candidate</h4>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h5 className="text-lg font-bold text-on-surface">{topCandidate.name}</h5>
                  <span className="font-mono text-[10px] font-medium text-on-surface-variant mt-1 block">MMSI: {topCandidate.mmsi} | FLAG: {topCandidate.flag} | TYPE: {topCandidate.type}</span>
                </div>
                <div className="bg-error/10 text-error border border-error/30 px-3 py-1 rounded font-mono text-[9px] font-bold uppercase">
                  {topCandidate.status}
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed mb-6 font-medium">
                Corroborated AIS tracks indicate this vessel traversed the exact spatio-temporal origin region bounded by the hindcast model. A critical AIS telemetry gap was recorded during this transit window, which strongly correlates with typical illicit discharge behavior.
              </p>
              <div className="flex items-center gap-3 bg-surface-container-lowest p-3 rounded border border-outline-variant">
                 <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase whitespace-nowrap">Overall Evidence Score</span>
                 <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                   <div className="h-full bg-error" style={{ width: `${(topCandidate.evidenceScore * 100)}%` }}></div>
                 </div>
                 <span className="font-mono text-sm font-bold text-error">{(topCandidate.evidenceScore * 100).toFixed(0)}</span>
              </div>
            </div>

            <div className="bg-surface border border-outline-variant p-6 rounded shadow-sm">
              <h4 className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-4 pb-2 border-b border-outline-variant">Other Investigated Candidates</h4>
              <div className="space-y-3">
                {incident.vesselCandidates.filter(c => c.mmsi !== topCandidate.mmsi).map(c => (
                  <div key={c.mmsi} className="flex items-center justify-between bg-surface-container-lowest p-3 rounded border border-outline-variant">
                    <div>
                      <span className="text-xs font-bold text-on-surface block mb-0.5">{c.name} <span className="font-mono text-[10px] text-on-surface-variant font-medium">(MMSI: {c.mmsi})</span></span>
                      <span className="text-[9px] font-bold tracking-widest uppercase text-tertiary">{c.status}</span>
                    </div>
                    <div className="font-mono text-sm font-bold text-tertiary flex items-center gap-1">
                      {(c.evidenceScore * 100).toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </section>

        {/* 3. Evidentiary Record */}
        <section>
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-outline-variant pb-2">
            <ListChecks className="w-4 h-4" /> 3. Data Quality & Uncertainty
          </h3>
          <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-4 text-[9px] font-bold tracking-widest text-on-surface-variant uppercase w-1/3">Evidence Modality</th>
                  <th className="p-4 text-[9px] font-bold tracking-widest text-on-surface-variant uppercase w-1/3">Status</th>
                  <th className="p-4 text-[9px] font-bold tracking-widest text-on-surface-variant uppercase w-1/3">Confidence State</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                <tr className="border-b border-outline-variant bg-surface-container-lowest">
                  <td className="p-4 font-mono font-bold text-on-surface flex items-center gap-3"><Satellite className="w-4 h-4 text-primary"/> SAR Backscatter</td>
                  <td className="p-4 text-on-surface-variant font-medium">Confirmed via {incident.satellite.source}</td>
                  <td className="p-4 text-primary font-bold">High</td>
                </tr>
                <tr className="border-b border-outline-variant bg-surface-container-lowest">
                  <td className="p-4 font-mono font-bold text-on-surface flex items-center gap-3"><ImageIcon className="w-4 h-4 text-primary"/> Optical Corroboration</td>
                  <td className="p-4 text-on-surface-variant font-medium">Pending Data Availability</td>
                  <td className="p-4 text-tertiary font-bold">Medium</td>
                </tr>
                <tr className="border-b border-outline-variant bg-surface-container-lowest">
                  <td className="p-4 font-mono font-bold text-on-surface flex items-center gap-3"><Wind className="w-4 h-4 text-primary"/> Drift Hindcast</td>
                  <td className="p-4 text-on-surface-variant font-medium">Correlated via OpenDrift (ERA5)</td>
                  <td className="p-4 text-primary font-bold">High</td>
                </tr>
                <tr className="bg-surface-container-lowest">
                  <td className="p-4 font-mono font-bold text-on-surface flex items-center gap-3"><RadioTower className="w-4 h-4 text-primary"/> AIS Correlation</td>
                  <td className="p-4 text-on-surface-variant font-medium">Direct spatial overlap established</td>
                  <td className="p-4 text-primary font-bold">High</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-bold font-mono tracking-widest text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shadow-sm"></span>
            AQUILA SYSTEM GENERATED
          </div>
          <div>Page 1 of 1</div>
          <div>DOCUMENT ID: {incident.id}-DOC-8894</div>
        </footer>

      </div>
    </div>
  );
}
