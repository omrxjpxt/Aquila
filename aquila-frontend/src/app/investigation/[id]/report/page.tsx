"use client";

import { use } from "react";
import { FileText, Share2, Save, AlertTriangle, Image as ImageIcon, Crosshair, HelpCircle, Wind, Anchor, Search, Database, Clock, ListChecks, Info, RadioTower, Satellite } from "lucide-react";
import { mockIncident } from "@/lib/mockData";

export default function InvestigationReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const incident = mockIncident;

  const topCandidate = incident.candidates.find(c => c.status === "Highest-Ranked Candidate") || incident.candidates[0];

  return (
    <div className="flex-1 p-6 flex justify-center overflow-y-auto h-full bg-[var(--color-surface-container-lowest)]">
      
      {/* Report Container */}
      <div className="w-full max-w-5xl bg-[var(--color-surface-low)] border border-[var(--color-outline-variant)] shadow-[0px_8px_24px_rgba(0,0,0,0.5)] p-8 rounded-lg relative overflow-hidden mb-16">
        
        {/* Atmospheric Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-50"></div>
        
        {/* Report Header */}
        <header className="flex flex-col md:flex-row justify-between items-start border-b border-[var(--color-outline-variant)] pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-primary)] tracking-tight mb-2">AQUILA</h1>
            <h2 className="text-xl font-semibold text-[var(--color-on-surface)] uppercase tracking-wide">MARITIME POLLUTION INVESTIGATION REPORT</h2>
            <p className="font-mono text-sm text-[var(--color-on-surface-variant)] mt-2">REF: {incident.id} | GEN: {new Date().toISOString().split('T')[0]}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button className="bg-[var(--color-primary-container)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary)] transition-colors px-4 py-2 rounded flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase">
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <button className="border border-[var(--color-outline-variant)] text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors px-4 py-2 rounded flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase">
              <Share2 className="w-4 h-4" />
              Share Report
            </button>
            <button className="border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] hover:border-[var(--color-primary)] transition-colors px-4 py-2 rounded flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase">
              <Save className="w-4 h-4" />
              Save Report
            </button>
          </div>
        </header>

        {/* Incident Metrics Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8 bg-[var(--color-surface-container)] border-y border-[var(--color-outline-variant)] py-4 px-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Incident ID</span>
            <span className="font-mono text-sm text-[var(--color-on-surface)]">{incident.id}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Detection Time</span>
            <span className="font-mono text-sm text-[var(--color-on-surface)]">{incident.initialDetectionTime.split('T')[1].slice(0,5)}Z</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Location</span>
            <span className="font-mono text-sm text-[var(--color-on-surface)]">{incident.centerCoord[1].toFixed(1)}°N, {incident.centerCoord[0].toFixed(1)}°E</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Spill Area</span>
            <span className="font-mono text-sm text-[var(--color-on-surface)]">{incident.surfaceAreaKm2} km²</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Assessment</span>
            <span className="font-mono text-sm text-[var(--color-primary)]">High Confidence</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Data Quality</span>
            <span className="font-mono text-sm text-[var(--color-primary)]">{incident.dataQuality}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Top Candidate</span>
            <span className="font-mono text-sm text-[var(--color-error)]">MMSI {topCandidate.mmsi}</span>
          </div>
        </div>

        {/* 1. Incident Summary */}
        <section className="mb-10 bg-[var(--color-surface-container)] p-6 rounded border border-[var(--color-outline-variant)]">
          <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> 1. Incident Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Status</span>
              <div className="font-mono text-sm text-[var(--color-on-surface)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary-container)] shadow-[0_0_8px_#28c7d9]"></span>
                {incident.status}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Priority</span>
              <div className="font-mono text-sm text-[var(--color-error)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {incident.priority}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-1">Oil Classification</span>
              <div className="font-mono text-sm text-[var(--color-on-surface)]">
                {incident.slickClassification}
              </div>
            </div>
          </div>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-6 leading-relaxed">
            On {incident.initialDetectionTime}, the AQUILA autonomous detection pipeline identified a major surface anomaly spanning {incident.surfaceAreaKm2} km² in the vicinity of {incident.centerCoord[1].toFixed(2)}°N, {incident.centerCoord[0].toFixed(2)}°E. The morphological characteristics and SVM classification strongly indicate an anthropogenic origin, specifically consistent with {incident.slickClassification.toLowerCase()}. Natural biofilm and biogenic look-alikes have been eliminated from the candidate hypothesis space.
          </p>
        </section>

        {/* 2. Source Attribution */}
        <section className="mb-10">
          <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" /> 2. Source Attribution & Candidate Analysis
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-[var(--color-surface-container)] p-6 rounded border border-[var(--color-outline-variant)]">
              <h4 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-4 pb-2 border-b border-[var(--color-outline-variant)]">Highest-Ranked Candidate</h4>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h5 className="text-xl font-bold text-[var(--color-on-surface)]">{topCandidate.name}</h5>
                  <span className="font-mono text-sm text-[var(--color-on-surface-variant)]">MMSI: {topCandidate.mmsi} | FLAG: {topCandidate.flag} | TYPE: {topCandidate.type}</span>
                </div>
                <div className="bg-[var(--color-error)]/10 text-[var(--color-error)] border border-[var(--color-error)]/30 px-3 py-1 rounded font-mono text-xs font-bold uppercase">
                  {topCandidate.status}
                </div>
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed mb-4">
                Corroborated AIS tracks indicate this vessel traversed the exact spatio-temporal origin region bounded by the hindcast model. A critical AIS telemetry gap was recorded during this transit window, which strongly correlates with typical illicit discharge behavior.
              </p>
              <div className="flex items-center gap-2 bg-[var(--color-surface-low)] p-3 rounded border border-[var(--color-outline-variant)]">
                 <span className="text-[10px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Overall Evidence Score</span>
                 <div className="flex-1 h-2 bg-[var(--color-surface-high)] rounded overflow-hidden mx-2">
                   <div className="h-full bg-[var(--color-error)]" style={{ width: `${(topCandidate.evidenceScore * 100)}%` }}></div>
                 </div>
                 <span className="font-mono text-sm font-bold text-[var(--color-error)]">{(topCandidate.evidenceScore * 100).toFixed(0)}</span>
              </div>
            </div>

            <div className="bg-[var(--color-surface-container)] p-6 rounded border border-[var(--color-outline-variant)]">
              <h4 className="text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase mb-4 pb-2 border-b border-[var(--color-outline-variant)]">Other Investigated Candidates</h4>
              <div className="space-y-4">
                {incident.candidates.filter(c => c.mmsi !== topCandidate.mmsi).map(c => (
                  <div key={c.mmsi} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-[var(--color-on-surface)] block">{c.name} (MMSI: {c.mmsi})</span>
                      <span className="text-xs text-[var(--color-on-surface-variant)]">{c.status}</span>
                    </div>
                    <div className="font-mono text-sm text-[var(--color-tertiary)] flex items-center gap-1">
                      Score: {(c.evidenceScore * 100).toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </section>

        {/* 3. Evidentiary Record */}
        <section>
          <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
            <ListChecks className="w-5 h-5" /> 3. Data Quality & Uncertainty
          </h3>
          <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-low)] border-b border-[var(--color-outline-variant)]">
                  <th className="p-4 text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase w-1/3">Evidence Modality</th>
                  <th className="p-4 text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase w-1/3">Status</th>
                  <th className="p-4 text-[11px] font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase w-1/3">Confidence State</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-[var(--color-outline-variant)]">
                  <td className="p-4 font-mono text-[var(--color-on-surface)] flex items-center gap-2"><Satellite className="w-4 h-4 text-[var(--color-primary)]"/> SAR Backscatter</td>
                  <td className="p-4 text-[var(--color-on-surface-variant)]">{incident.evidenceScores.sarBackscatter}</td>
                  <td className="p-4 text-[#4ade80]">High (Sentinel-1 GRD)</td>
                </tr>
                <tr className="border-b border-[var(--color-outline-variant)]">
                  <td className="p-4 font-mono text-[var(--color-on-surface)] flex items-center gap-2"><ImageIcon className="w-4 h-4 text-[var(--color-primary)]"/> Optical Corroboration</td>
                  <td className="p-4 text-[var(--color-on-surface-variant)]">{incident.evidenceScores.opticalConfirmation}</td>
                  <td className="p-4 text-[var(--color-tertiary)]">Pending Data Availability</td>
                </tr>
                <tr className="border-b border-[var(--color-outline-variant)]">
                  <td className="p-4 font-mono text-[var(--color-on-surface)] flex items-center gap-2"><Wind className="w-4 h-4 text-[var(--color-primary)]"/> Drift Hindcast</td>
                  <td className="p-4 text-[var(--color-on-surface-variant)]">{incident.evidenceScores.windHindcast}</td>
                  <td className="p-4 text-[#4ade80]">High (ERA5 + OpenDrift)</td>
                </tr>
                <tr>
                  <td className="p-4 font-mono text-[var(--color-on-surface)] flex items-center gap-2"><RadioTower className="w-4 h-4 text-[var(--color-primary)]"/> AIS Correlation</td>
                  <td className="p-4 text-[var(--color-on-surface-variant)]">{incident.evidenceScores.aisCorrelation}</td>
                  <td className="p-4 text-[#4ade80]">High</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-[var(--color-outline-variant)] flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-[var(--color-on-surface-variant)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
            AQUILA SYSTEM GENERATED
          </div>
          <div>Page 1 of 1</div>
          <div>DOCUMENT ID: {incident.id}-DOC-8894</div>
        </footer>

      </div>
    </div>
  );
}
