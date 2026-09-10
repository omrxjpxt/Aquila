with open("aquila-frontend/src/app/investigation/[id]/report/page.tsx", "w") as f:
    f.write('''"use client";

import { use, useEffect } from "react";
import { FileText, Share2, Save, AlertTriangle, Image as ImageIcon, Search, ListChecks, RadioTower, Satellite, Wind, MapPin, Anchor, Activity, Clock, Server } from "lucide-react";
import { useInvestigation } from "@/contexts/InvestigationContext";

export default function InvestigationReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { 
    investigation, 
    scene, 
    candidates, 
    selectedCandidateId, 
    assessments, 
    driftResults, 
    vesselCandidates, 
    attributionResults, 
    environmentalData,
    simulationResults,
    loadInvestigation, 
    isLoading, 
    error 
  } = useInvestigation();
  
  useEffect(() => {
    loadInvestigation(id);
  }, [id, loadInvestigation]);

  if (isLoading && !investigation) {
    return <div className="flex w-full h-full items-center justify-center bg-surface text-on-surface-variant">Loading report...</div>;
  }

  if (error && !investigation) {
    return <div className="flex w-full h-full items-center justify-center bg-surface text-error">Failed to load report: {error}</div>;
  }

  const candidate = candidates.find(c => c.id === selectedCandidateId) || candidates[0];
  const assessment = candidate ? assessments[candidate.id] : null;
  
  const scenarioId = Object.keys(driftResults)[0];
  const drift = scenarioId ? driftResults[scenarioId] : null;
  const ais = scenarioId ? vesselCandidates[scenarioId] : null;
  const attribution = scenarioId ? attributionResults[scenarioId] : null;
  
  // Environment
  const envData = environmentalData && Object.keys(environmentalData).length > 0 ? Object.values(environmentalData)[0] : null;
  
  // Simulation
  const sim = simulationResults && Object.keys(simulationResults).length > 0 ? Object.values(simulationResults)[0] : null;
  
  // Top Candidate
  const topCandidate = attribution 
    ? [...attribution.candidates].sort((a, b) => b.evidence_ranking_score - a.evidence_ranking_score)[0]
    : null;
    
  const topVessel = topCandidate && ais 
    ? ais.find(v => v.identity.mmsi === topCandidate.vessel_identity.mmsi)
    : null;

  // Provenance Helper
  const ProvenanceBadge = ({ prov }: { prov?: string }) => {
    if (!prov) return <span className="text-[9px] bg-surface-variant text-on-surface-variant px-1 rounded font-bold uppercase tracking-widest border border-outline-variant">UNAVAILABLE</span>;
    
    if (prov.toUpperCase().includes("MOCK") || prov.toUpperCase().includes("DEMO")) {
      return <span className="text-[9px] bg-tertiary/10 text-tertiary px-1 rounded font-bold uppercase tracking-widest border border-tertiary/30">DEMO_MOCK</span>;
    }
    return <span className="text-[9px] bg-success/10 text-success px-1 rounded font-bold uppercase tracking-widest border border-success/30">LIVE</span>;
  };

  return (
    <div className="flex-1 p-6 flex justify-center overflow-y-auto h-full bg-[#eef4f8]">
      
      <div className="w-full max-w-5xl bg-surface border border-outline-variant shadow-sm p-8 rounded-lg relative overflow-hidden mb-16">
        
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"></div>
        
        <header className="flex flex-col md:flex-row justify-between items-start border-b border-outline-variant pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">AQUILA</h1>
            <h2 className="text-xl font-bold text-on-surface uppercase tracking-wide">MARITIME FORENSIC INVESTIGATION REPORT</h2>
            <p className="font-mono text-xs font-bold text-on-surface-variant mt-2 tracking-wider">REF: {id} | GEN: {new Date().toISOString().split('T')[0]}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => window.print()} className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary border border-primary/20 transition-colors px-4 py-2 rounded flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase shadow-sm">
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <button className="bg-surface text-on-surface hover:text-primary hover:border-primary border border-outline-variant transition-colors px-4 py-2 rounded flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase shadow-sm">
              <Share2 className="w-4 h-4" />
              Share Report
            </button>
          </div>
        </header>

        {/* 1. Investigation */}
        <section className="mb-8">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-outline-variant pb-2">
            <FileText className="w-4 h-4" /> 1. Investigation Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant">
              <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Investigation ID</span>
              <span className="font-bold text-on-surface">{id}</span>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant">
              <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Creation Mode</span>
              <span className="font-bold text-on-surface">{investigation?.creation_mode || 'UNAVAILABLE'}</span>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant">
              <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Status</span>
              <span className="font-bold text-on-surface">{investigation?.status || 'UNAVAILABLE'}</span>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant">
              <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Created At</span>
              <span className="font-bold text-on-surface">{investigation?.created_at ? new Date(investigation.created_at).toISOString().slice(0,19)+'Z' : 'UNAVAILABLE'}</span>
            </div>
          </div>
        </section>

        {/* 2. Satellite Detection */}
        <section className="mb-8">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-outline-variant pb-2">
            <Satellite className="w-4 h-4" /> 2. Satellite Detection
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono mb-4">
            <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant">
              <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Source</span>
              <span className="font-bold text-on-surface">Sentinel-1 SAR</span>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant col-span-2">
              <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Scene/Product ID</span>
              <span className="font-bold text-on-surface truncate">{scene?.scene_id || 'UNAVAILABLE'}</span>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant">
              <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Acquisition Time</span>
              <span className="font-bold text-on-surface">{scene?.acquisition_time ? new Date(scene.acquisition_time).toISOString().slice(0,19)+'Z' : 'UNAVAILABLE'}</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-3 rounded border border-outline-variant text-xs font-mono">
            <span className="font-bold text-on-surface-variant mr-2">AOI BBox:</span>
            {scene?.bbox ? `[${scene.bbox.map(x => x.toFixed(3)).join(', ')}]` : 'UNAVAILABLE'}
          </div>
        </section>

        {/* 3. Slick Assessment */}
        <section className="mb-8">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-outline-variant pb-2">
            <Activity className="w-4 h-4" /> 3. Slick Assessment
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono mb-2">
            <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant">
              <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Classification</span>
              <span className="font-bold text-on-surface">{assessment?.classification || 'UNAVAILABLE'}</span>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant">
              <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Raw Decision Score</span>
              <span className="font-bold text-primary">{assessment?.raw_score?.toFixed(3) || 'UNAVAILABLE'}</span>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded border border-outline-variant">
              <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Evaluation Status</span>
              <span className="font-bold text-on-surface">{assessment?.evaluation_status || 'UNAVAILABLE'}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="col-span-2 text-[10px] text-on-surface-variant flex items-center gap-2">
              <strong>Model:</strong> {assessment?.model_version || 'UNAVAILABLE'} <ProvenanceBadge prov={assessment?.provenance} />
            </div>
          </div>
        </section>

        {/* 4. Environmental Evidence */}
        <section className="mb-8">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-outline-variant pb-2">
            <Wind className="w-4 h-4" /> 4. Environmental Evidence
          </h3>
          <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant">
            {envData ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
                <div>
                  <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Wind (U, V)</span>
                  <span className="font-bold text-on-surface">{envData.wind_u?.toFixed(2)}, {envData.wind_v?.toFixed(2)} m/s</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Current (U, V)</span>
                  <span className="font-bold text-on-surface">{envData.current_u?.toFixed(2)}, {envData.current_v?.toFixed(2)} m/s</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Timestamp</span>
                  <span className="font-bold text-on-surface">{new Date(envData.timestamp).toISOString().slice(11, 16)}Z</span>
                </div>
                <div className="col-span-2 flex justify-end items-start gap-2">
                  <span className="font-bold text-[10px] uppercase text-on-surface-variant">Provider: {envData.provider}</span>
                  <ProvenanceBadge prov={envData.provenance} />
                </div>
              </div>
            ) : (
              <span className="text-xs font-mono text-on-surface-variant">Environmental data UNAVAILABLE</span>
            )}
          </div>
        </section>

        {/* 5. Drift Reconstruction */}
        <section className="mb-8">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-outline-variant pb-2">
            <MapPin className="w-4 h-4" /> 5. Drift Reconstruction
          </h3>
          <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant">
            {drift ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Type</span>
                  <span className="font-bold text-on-surface">{drift.is_hindcast ? 'HINDCAST' : 'FORECAST'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Duration</span>
                  <span className="font-bold text-on-surface">{Math.abs(drift.duration_hours)} hours</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Status</span>
                  <span className="font-bold text-on-surface">{drift.status}</span>
                </div>
                <div className="flex justify-end">
                  <ProvenanceBadge prov={drift.provenance} />
                </div>
              </div>
            ) : (
              <span className="text-xs font-mono text-on-surface-variant">Drift results UNAVAILABLE</span>
            )}
          </div>
        </section>

        {/* 6 & 7. Vessel Evidence & Attribution */}
        <section className="mb-8">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-outline-variant pb-2">
            <Anchor className="w-4 h-4" /> 6 & 7. Vessel Attribution & Evidence
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant">
              <h4 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-3">Highest-Ranked Candidate</h4>
              {topCandidate && topVessel ? (
                <>
                  <div className="mb-4">
                    <h5 className="text-sm font-bold text-on-surface">{topVessel.identity.name || 'UNKNOWN'}</h5>
                    <span className="font-mono text-[10px] text-on-surface-variant">MMSI: {topVessel.identity.mmsi}</span>
                  </div>
                  <div className="flex items-center justify-between bg-surface-container-low p-2 rounded border border-outline-variant mb-2 text-xs font-mono">
                    <span className="font-bold text-on-surface-variant">Compatibility Score</span>
                    <span className="font-bold text-primary text-sm">{topCandidate.evidence_ranking_score}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant mb-3">
                    <span>Evidence Coverage: <strong>{topCandidate.evidence_coverage}</strong></span>
                  </div>
                  <div className="flex gap-2 text-center text-xs">
                    <div className="flex-1 bg-success/10 border border-success/30 rounded py-1">
                      <span className="block font-bold text-success">{topCandidate.supporting_count}</span>
                      <span className="text-[8px] uppercase tracking-widest">Supporting</span>
                    </div>
                    <div className="flex-1 bg-surface-variant/30 border border-outline-variant rounded py-1">
                      <span className="block font-bold text-on-surface-variant">{topCandidate.neutral_count}</span>
                      <span className="text-[8px] uppercase tracking-widest">Neutral</span>
                    </div>
                    <div className="flex-1 bg-error/10 border border-error/30 rounded py-1">
                      <span className="block font-bold text-error">{topCandidate.contradicting_count}</span>
                      <span className="text-[8px] uppercase tracking-widest">Contradict</span>
                    </div>
                  </div>
                </>
              ) : (
                 <span className="text-xs font-mono text-on-surface-variant italic">Attribution UNAVAILABLE</span>
              )}
            </div>
            
            <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant">
              <h4 className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-3">Factor Breakdown (Top Lead)</h4>
              {topCandidate ? (
                <div className="space-y-2 text-xs font-mono max-h-[200px] overflow-y-auto pr-2">
                  {topCandidate.factors.map(f => (
                    <div key={f.factor_name} className="flex flex-col p-2 border border-outline-variant rounded bg-surface">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[10px]">{f.factor_name}</span>
                        <span className={`text-[8px] font-bold px-1 rounded uppercase tracking-widest ${
                          f.status === 'SUPPORTING' ? 'text-success bg-success/10 border border-success/20' :
                          f.status === 'CONTRADICTING' ? 'text-error bg-error/10 border border-error/20' :
                          'text-on-surface-variant bg-surface-container-low border border-outline-variant'
                        }`}>{f.status}</span>
                      </div>
                      <span className="text-[9px] text-on-surface-variant leading-tight">{f.interpretation}</span>
                      <div className="mt-1 flex justify-between items-center text-[8px]">
                        <span>Source: {f.evidence_source}</span>
                        <ProvenanceBadge prov={f.provenance} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-mono text-on-surface-variant italic">Breakdown UNAVAILABLE</span>
              )}
            </div>
          </div>
        </section>

        {/* 8. Counterfactual Simulation */}
        <section className="mb-8">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-outline-variant pb-2">
            <RadioTower className="w-4 h-4" /> 8. Counterfactual Simulation
          </h3>
          <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant">
            {sim ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div className="col-span-2">
                  <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Interpretation</span>
                  <span className="font-bold text-on-surface">{sim.interpretation}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">IoU Score</span>
                  <span className="font-bold text-primary">{sim.overlap_iou?.toFixed(3) || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Centroid Distance</span>
                  <span className="font-bold text-on-surface">{sim.centroid_distance_km?.toFixed(2)} km</span>
                </div>
              </div>
            ) : (
              <span className="text-xs font-mono text-on-surface-variant italic">Simulation results UNAVAILABLE</span>
            )}
          </div>
        </section>

        {/* 9. Timeline */}
        <section className="mb-10">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-outline-variant pb-2">
            <Clock className="w-4 h-4" /> 9. Timeline
          </h3>
          <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant text-xs font-mono">
            {investigation ? (
              <ul className="space-y-3">
                <li className="flex gap-4 items-start">
                  <span className="text-on-surface-variant font-bold w-[130px] shrink-0">{new Date(investigation.created_at).toISOString().slice(0,19)+'Z'}</span>
                  <div>
                    <span className="font-bold text-on-surface block">Investigation Opened</span>
                    <span className="text-[10px] text-on-surface-variant">Priority set to {investigation.priority}</span>
                  </div>
                </li>
                {investigation.updated_at !== investigation.created_at && (
                  <li className="flex gap-4 items-start">
                    <span className="text-on-surface-variant font-bold w-[130px] shrink-0">{new Date(investigation.updated_at).toISOString().slice(0,19)+'Z'}</span>
                    <div>
                      <span className="font-bold text-on-surface block">Investigation Updated</span>
                      <span className="text-[10px] text-on-surface-variant">Latest state transition</span>
                    </div>
                  </li>
                )}
              </ul>
            ) : (
              <span className="text-xs font-mono text-on-surface-variant italic">Timeline UNAVAILABLE</span>
            )}
          </div>
        </section>

        {/* 11. Limitations */}
        <section className="bg-tertiary/10 border border-tertiary/30 p-4 rounded-lg">
          <h3 className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> 11. Limitations & Disclaimers
          </h3>
          <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
            The vessel ranking provided in this report is an <strong>investigative lead</strong> based on automated correlation of spatial, temporal, and environmental data. It <strong>does not establish causation or legal responsibility</strong>. All simulated outputs, classifications, and trajectory projections are subject to model uncertainty and input data limitations.
          </p>
        </section>

        <footer className="mt-8 pt-6 border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-bold font-mono tracking-widest text-on-surface-variant">
          <div className="flex items-center gap-2">
            <Server className="w-3 h-3 text-primary" />
            AQUILA SYSTEM GENERATED
          </div>
          <div>Page 1 of 1</div>
          <div>DOCUMENT ID: {id}-DOC-8894</div>
        </footer>

      </div>
    </div>
  );
}
''')
