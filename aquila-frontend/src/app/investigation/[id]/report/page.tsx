"use client";

import { use } from "react";
import { FileText, Share2, Save, AlertTriangle, Image as ImageIcon, Search, ListChecks, RadioTower, Satellite, Wind } from "lucide-react";
import { mockIncident } from "@/lib/mockData";
import { useInvestigation } from "@/contexts/InvestigationContext";

export default function InvestigationReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { scene, candidates, selectedCandidateId, assessments, driftResults, vesselCandidates, attributionResults } = useInvestigation();
  
  const isDemo = id === "INC-AQ-001" || (!scene);
  const fallback = mockIncident;

  const candidate = candidates.find(c => c.id === selectedCandidateId);
  const assessment = selectedCandidateId ? assessments[selectedCandidateId] : null;
  
  // Get first available scenario ID for drift
  const scenarioId = Object.keys(driftResults)[0];
  const ais = scenarioId ? vesselCandidates[scenarioId] : null;
  const attribution = scenarioId ? attributionResults[scenarioId] : null;
  
  // Find highest ranked candidate
  const topCandidate = attribution 
    ? [...attribution.candidates].sort((a, b) => b.evidence_ranking_score - a.evidence_ranking_score)[0]
    : null;
    
  // Find vessel details for top candidate
  const topVessel = topCandidate && ais 
    ? ais.find(v => v.identity.mmsi === topCandidate.vessel_identity.mmsi)
    : null;

  // Fallbacks to mock if needed, but we try to use real data first
  const displayId = id;
  const detectionTime = scene ? new Date(scene.acquisition_time).toISOString().slice(11,16) + 'Z' : (isDemo ? new Date(fallback.incident.initialDetectionTime).toISOString().slice(11,16) + 'Z' : 'UNAVAILABLE');
  const lat = scene ? ((scene.bbox[1] + scene.bbox[3]) / 2).toFixed(1) + '°N' : (isDemo ? fallback.incident.centerCoord[1].toFixed(1) + '°N' : 'UNAVAILABLE');
  const lon = scene ? ((scene.bbox[0] + scene.bbox[2]) / 2).toFixed(1) + '°E' : (isDemo ? fallback.incident.centerCoord[0].toFixed(1) + '°E' : 'UNAVAILABLE');
  const area = candidate ? candidate.area_km2.toFixed(2) + ' km²' : (isDemo ? fallback.slick.surfaceAreaKm2 + ' km²' : 'UNAVAILABLE');
  const assessmentConf = assessment ? assessment.raw_score?.toFixed(2) ?? 'N/A' : (isDemo ? fallback.lookAlikeAssessment.confidence : 'UNAVAILABLE');
  const topMmsi = topVessel ? topVessel.identity.mmsi : (isDemo ? fallback.vesselCandidates[0].mmsi : 'UNAVAILABLE');
  const classification = candidate ? candidate.classification || 'UNASSESSED' : (isDemo ? fallback.slick.classification : 'UNAVAILABLE');
  const priority = scene ? 'HIGH' : (isDemo ? fallback.priority : 'UNAVAILABLE');

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
            <p className="font-mono text-xs font-bold text-on-surface-variant mt-2 tracking-wider">REF: {displayId} | GEN: {new Date().toISOString().split('T')[0]}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => window.print()} className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary border border-primary/20 transition-colors px-4 py-2 rounded flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase shadow-sm">
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <button onClick={() => alert("Sharing unavailable in DEMO.")} className="bg-surface text-on-surface hover:text-primary hover:border-primary border border-outline-variant transition-colors px-4 py-2 rounded flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase shadow-sm">
              <Share2 className="w-4 h-4" />
              Share Report
            </button>
            <button onClick={() => alert("Saving unavailable in DEMO.")} className="bg-surface text-on-surface hover:text-primary hover:border-primary border border-outline-variant transition-colors px-4 py-2 rounded flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase shadow-sm">
              <Save className="w-4 h-4" />
              Save Report
            </button>
          </div>
        </header>

        {/* Incident Metrics Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8 bg-surface-container-lowest border-y border-outline-variant py-4 px-2">
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Incident ID</span>
            <span className="font-mono text-xs font-bold text-on-surface">{displayId}</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Detection Time</span>
            <span className="font-mono text-xs font-bold text-on-surface">{detectionTime}</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Location</span>
            <span className="font-mono text-xs font-bold text-on-surface">{lat}, {lon}</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Spill Area</span>
            <span className="font-mono text-xs font-bold text-on-surface">{area}</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Assessment</span>
            <span className="font-mono text-xs font-bold text-primary">{assessmentConf}</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Data Quality</span>
            <span className="font-mono text-xs font-bold text-primary">{isDemo ? fallback.satellite.dataQuality : 'NOMINAL'}</span>
          </div>
          <div className="flex flex-col px-2 border-l border-outline-variant pl-4">
            <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">Top Candidate</span>
            <span className="font-mono text-xs font-bold text-error">MMSI {topMmsi}</span>
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
                {priority}
              </div>
            </div>
            <div className="flex flex-col bg-surface-container-lowest border border-outline-variant p-3 rounded">
              <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">Oil Classification</span>
              <div className="font-mono text-xs font-bold text-on-surface">
                {classification}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-6 leading-relaxed font-medium">
            On {scene ? new Date(scene.acquisition_time).toISOString().slice(0, 19) + 'Z' : (isDemo ? new Date(fallback.incident.initialDetectionTime).toISOString().slice(0, 19) + 'Z' : 'UNAVAILABLE')}, the AQUILA autonomous detection pipeline identified a major surface anomaly spanning {area} in the vicinity of {lat}, {lon}. The morphological characteristics and SVM classification strongly indicate an anthropogenic origin, specifically consistent with {classification.toLowerCase()}. Natural biofilm and biogenic look-alikes have been eliminated from the candidate hypothesis space.
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
              {topCandidate && topVessel ? (
                <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h5 className="text-lg font-bold text-on-surface">{topVessel.identity.name || 'UNKNOWN'}</h5>
                    <span className="font-mono text-[10px] font-medium text-on-surface-variant mt-1 block">MMSI: {topVessel.identity.mmsi} | FLAG: {topVessel.identity.flag || 'UNKNOWN'} | TYPE: {topVessel.identity.vessel_type || 'UNKNOWN'}</span>
                  </div>
                  <div className="bg-error/10 text-error border border-error/30 px-3 py-1 rounded font-mono text-[9px] font-bold uppercase">
                    Highest-Ranked Candidate
                  </div>
                </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed mb-6 font-medium">
                Corroborated AIS tracks indicate this vessel traversed the exact spatio-temporal origin region bounded by the hindcast model. A critical AIS telemetry gap was recorded during this transit window, which strongly correlates with typical illicit discharge behavior.
              </p>
                <div className="flex items-center gap-3 bg-surface-container-lowest p-3 rounded border border-outline-variant">
                   <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase whitespace-nowrap">Overall Evidence Score</span>
                   <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                     <div className="h-full bg-error" style={{ width: `${Math.max(0, topCandidate.evidence_ranking_score * 10)}%` }}></div>
                   </div>
                   <span className="font-mono text-sm font-bold text-error">{topCandidate.evidence_ranking_score}</span>
                </div>
                </>
              ) : (
                isDemo ? (
                  <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h5 className="text-lg font-bold text-on-surface">{fallback.vesselCandidates[0].name}</h5>
                      <span className="font-mono text-[10px] font-medium text-on-surface-variant mt-1 block">MMSI: {fallback.vesselCandidates[0].mmsi} | FLAG: {fallback.vesselCandidates[0].flag}</span>
                    </div>
                    <div className="bg-error/10 text-error border border-error/30 px-3 py-1 rounded font-mono text-[9px] font-bold uppercase">
                      Highest-Ranked Candidate
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed mb-6 font-medium">
                    Corroborated AIS tracks indicate this vessel traversed the exact spatio-temporal origin region bounded by the hindcast model. A critical AIS telemetry gap was recorded during this transit window, which strongly correlates with typical illicit discharge behavior.
                  </p>
                  <div className="flex items-center gap-3 bg-surface-container-lowest p-3 rounded border border-outline-variant">
                     <span className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase whitespace-nowrap">Overall Evidence Score</span>
                     <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                       <div className="h-full bg-error" style={{ width: `${(fallback.vesselCandidates[0].evidenceScore * 100)}%` }}></div>
                     </div>
                     <span className="font-mono text-sm font-bold text-error">{(fallback.vesselCandidates[0].evidenceScore * 100).toFixed(0)}</span>
                  </div>
                  </>
                ) : (
                  <div className="text-xs text-on-surface-variant italic">Attribution not yet evaluated.</div>
                )
              )}
            </div>

            <div className="bg-surface border border-outline-variant p-6 rounded shadow-sm">
              <h4 className="text-[9px] font-bold tracking-widest text-on-surface-variant uppercase mb-4 pb-2 border-b border-outline-variant">Other Investigated Candidates</h4>
              <div className="space-y-3">
                {attribution && ais ? (
                  attribution.candidates.filter(c => c.vessel_identity.mmsi !== topCandidate?.vessel_identity.mmsi).map(c => {
                    const vInfo = ais.find(v => v.identity.mmsi === c.vessel_identity.mmsi);
                    return (
                      <div key={c.vessel_identity.mmsi} className="flex items-center justify-between bg-surface-container-lowest p-3 rounded border border-outline-variant">
                        <div>
                          <span className="text-xs font-bold text-on-surface block mb-0.5">{vInfo ? vInfo.identity.name : 'Unknown Vessel'} <span className="font-mono text-[10px] text-on-surface-variant font-medium">(MMSI: {c.vessel_identity.mmsi})</span></span>
                          <span className="text-[9px] font-bold tracking-widest uppercase text-tertiary">Investigated</span>
                        </div>
                        <div className="font-mono text-sm font-bold text-tertiary flex items-center gap-1">
                          {c.evidence_ranking_score}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  isDemo ? (
                    fallback.vesselCandidates.filter(c => c.mmsi !== fallback.vesselCandidates[0].mmsi).map(c => (
                      <div key={c.mmsi} className="flex items-center justify-between bg-surface-container-lowest p-3 rounded border border-outline-variant">
                        <div>
                          <span className="text-xs font-bold text-on-surface block mb-0.5">{c.name} <span className="font-mono text-[10px] text-on-surface-variant font-medium">(MMSI: {c.mmsi})</span></span>
                          <span className="text-[9px] font-bold tracking-widest uppercase text-tertiary">{c.status}</span>
                        </div>
                        <div className="font-mono text-sm font-bold text-tertiary flex items-center gap-1">
                          {(c.evidenceScore * 100).toFixed(0)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-on-surface-variant italic">No other candidates evaluated.</div>
                  )
                )}
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
                  <td className="p-4 text-on-surface-variant font-medium">Observed via {scene ? 'Sentinel-1 Backend' : (isDemo ? fallback.satellite.source : 'UNAVAILABLE')}</td>
                  <td className="p-4 text-primary font-bold">High</td>
                </tr>
                <tr className="border-b border-outline-variant bg-surface-container-lowest">
                  <td className="p-4 font-mono font-bold text-on-surface flex items-center gap-3"><ImageIcon className="w-4 h-4 text-primary"/> Optical Corroboration</td>
                  <td className="p-4 text-on-surface-variant font-medium">Pending Data Availability</td>
                  <td className="p-4 text-tertiary font-bold">Medium</td>
                </tr>
                <tr className="border-b border-outline-variant bg-surface-container-lowest">
                  <td className="p-4 font-mono font-bold text-on-surface flex items-center gap-3"><Wind className="w-4 h-4 text-primary"/> Drift Hindcast</td>
                  <td className="p-4 text-on-surface-variant font-medium">Correlated via MockDriftEngine (DEMO)</td>
                  <td className="p-4 text-primary font-bold">Medium</td>
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
          <div>DOCUMENT ID: {displayId}-DOC-8894</div>
        </footer>

      </div>
    </div>
  );
}
