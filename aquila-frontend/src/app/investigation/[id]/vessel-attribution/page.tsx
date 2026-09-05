"use client";

import { use, useEffect, useState } from "react";
import { MapLibreCanvas } from "@/components/map/MapLibreCanvas";
import { VesselTracksLayer, OriginRegionLayer } from "@/components/map/layers";
import { ListOrdered, ShieldCheck, Search, AlertTriangle, CheckCircle, XCircle, HelpCircle, AlertCircle } from "lucide-react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { EvidenceStatus } from "@/lib/api/types";

export default function VesselAttributionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { 
    loadInvestigation, 
    driftResults, 
    vesselCandidates, 
    findVesselCandidates,
    attributionResults,
    evaluateAttribution,
    isLoading
  } = useInvestigation();
  
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);
  const [expandedFactors, setExpandedFactors] = useState<Record<string, boolean>>({});
  const [aisMode, setAisMode] = useState<"MOCK" | "BYOD">("MOCK");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [declaredSource, setDeclaredSource] = useState("");

  const toggleFactor = (factorName: string) => {
    setExpandedFactors(prev => ({
      ...prev,
      [factorName]: !prev[factorName]
    }));
  };

  useEffect(() => {
    loadInvestigation(id);
  }, [id, loadInvestigation]);

  const scenarioId = `hindcast-${id}-24h`;
  const driftResult = driftResults[scenarioId];
  const candidates = vesselCandidates[scenarioId] || [];
  const attributionResult = attributionResults[scenarioId];

  const handleDiscover = () => {
    if (driftResult && driftResult.origin_estimate) {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      findVesselCandidates(
        id as string,
        scenarioId, 
        driftResult.origin_estimate, 
        startTime,
        endTime,
        aisMode
      );
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const { aisApi } = await import('@/lib/api/ais');
      const res = await aisApi.uploadByodData(id as string, uploadFile, declaredSource);
      setImportResult(res);
      setAisMode("BYOD"); // Auto switch mode to BYOD
    } catch (e: any) {
      alert(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleEvaluate = () => {
    if (driftResult && driftResult.origin_estimate && candidates.length > 0) {
      evaluateAttribution(id as string, scenarioId, driftResult.origin_estimate, driftResult, candidates);
    }
  };

  // If attribution has run, the selected candidate is from attributionResult.candidates
  // Otherwise it's from candidates.
  const displayCandidates = attributionResult ? attributionResult.candidates : candidates.map(c => ({
    vessel_identity: c.identity,
    factors: [],
    supporting_count: 0,
    contradicting_count: 0,
    neutral_count: 0,
    unavailable_count: 0,
    evidence_coverage: "0/0",
    evidence_ranking_score: 0,
    // Add raw track for map if needed
    _rawTrack: c
  }));

  const selectedCandidate = displayCandidates.find(c => c.vessel_identity.mmsi === selectedMmsi) || displayCandidates[0];

  const mapCenter: [number, number] = driftResult && driftResult.origin_estimate
    ? [
        driftResult.origin_estimate.geometry.coordinates[0][0][0], 
        driftResult.origin_estimate.geometry.coordinates[0][0][1]
      ]
    : [0, 0];

  const getStatusIcon = (status: EvidenceStatus) => {
    switch(status) {
      case "SUPPORTING": return <CheckCircle className="w-4 h-4 text-[#00647C]" />;
      case "CONTRADICTING": return <XCircle className="w-4 h-4 text-error" />;
      case "NEUTRAL": return <AlertCircle className="w-4 h-4 text-on-surface-variant" />;
      case "UNAVAILABLE": return <HelpCircle className="w-4 h-4 text-on-surface-variant/50" />;
    }
  };

  const getStatusColor = (status: EvidenceStatus) => {
    switch(status) {
      case "SUPPORTING": return "text-[#00647C] bg-[#00647C]/10 border-[#00647C]/20";
      case "CONTRADICTING": return "text-error bg-error/10 border-error/20";
      case "NEUTRAL": return "text-on-surface-variant bg-surface-variant/30 border-outline-variant";
      case "UNAVAILABLE": return "text-on-surface-variant/50 bg-surface-variant/10 border-outline-variant/50";
    }
  };

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-surface-lowest">
      
      {/* Background Map Layer */}
      <div className="absolute inset-0 z-0 bg-[#eef4f8]">
        {driftResult && driftResult.origin_estimate && (
          <MapLibreCanvas center={mapCenter} zoom={8}>
             <OriginRegionLayer geometry={driftResult.origin_estimate.geometry} visible={true} />
             <VesselTracksLayer candidates={candidates} selectedMmsi={selectedMmsi} />
          </MapLibreCanvas>
        )}
        
        {/* Map Legend Overlay */}
        <div className="absolute top-4 left-[340px] pointer-events-auto bg-surface/90 backdrop-blur border border-outline-variant rounded p-3 z-10 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-[#00647C]"></div>
            <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase">Observed Track</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 border-dashed border-b-2 border-[#eab308]"></div>
            <span className="font-mono text-[10px] text-on-surface-variant font-medium uppercase">AIS GAP (&gt;1h)</span>
          </div>
        </div>
      </div>

      <div className="relative z-20 flex-1 flex h-full pointer-events-none">
        
        {/* LEFT COLUMN: Candidate Vessels */}
        <div className="w-[320px] h-full flex flex-col pointer-events-auto border-r border-outline-variant bg-surface shrink-0 shadow-sm">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low flex flex-col gap-3">
            <div className="flex items-center gap-2 text-on-surface">
              <ListOrdered className="text-primary w-5 h-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Vessel Candidates</h2>
            </div>
            
            {(!candidates || candidates.length === 0) ? (
              <div className="flex flex-col gap-3">
                <div className="flex bg-surface-container rounded p-1 text-[10px] font-bold tracking-widest uppercase">
                  <button 
                    onClick={() => setAisMode("MOCK")}
                    className={`flex-1 py-1 rounded transition-colors ${aisMode === "MOCK" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"}`}
                  >
                    Mock AIS
                  </button>
                  <button 
                    onClick={() => setAisMode("BYOD")}
                    className={`flex-1 py-1 rounded transition-colors ${aisMode === "BYOD" ? "bg-[#00647C] text-white" : "text-on-surface-variant hover:bg-surface-container-high"}`}
                  >
                    BYOD AIS
                  </button>
                </div>
                
                {aisMode === "BYOD" && (
                  <div className="border border-dashed border-outline-variant rounded p-3 bg-surface text-xs space-y-2">
                    <span className="block font-bold text-on-surface uppercase tracking-wider mb-1">Upload Historical AIS</span>
                    <input 
                      type="file" 
                      accept=".csv,.json"
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                      className="block w-full text-[10px] text-on-surface-variant file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    <input 
                      type="text" 
                      placeholder="Declared Source (e.g. MarineTraffic)" 
                      value={declaredSource}
                      onChange={e => setDeclaredSource(e.target.value)}
                      className="w-full text-[10px] p-1.5 rounded border border-outline-variant bg-surface-container-lowest"
                    />
                    <button 
                      onClick={handleUpload}
                      disabled={!uploadFile || uploading}
                      className="w-full bg-[#00647C] hover:bg-[#005063] text-white font-bold text-[10px] uppercase tracking-wider py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      {uploading ? "Uploading..." : "Upload & Import"}
                    </button>
                    {importResult && (
                      <div className="mt-2 p-2 bg-[#00647C]/10 border border-[#00647C]/20 rounded space-y-1 text-[9px] font-mono">
                        <span className="block font-bold text-[#00647C] uppercase tracking-widest bg-[#00647C]/20 px-1 py-0.5 w-fit rounded">PROVENANCE: {importResult.provenance}</span>
                        {importResult.declared_source && <span className="block text-on-surface">Source: {importResult.declared_source}</span>}
                        <span className="block text-on-surface">Records: {importResult.record_count}</span>
                        <span className="block text-on-surface">Vessels: {importResult.vessel_count}</span>
                        <span className={`block font-bold ${importResult.validation_status === 'SUCCESS' ? 'text-[#00647C]' : 'text-error'}`}>Status: {importResult.validation_status}</span>
                        {importResult.warnings?.length > 0 && <span className="block text-[#eab308]">Warnings: {importResult.warnings.length}</span>}
                        {importResult.errors?.length > 0 && <span className="block text-error">Errors: {importResult.errors.length}</span>}
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={handleDiscover}
                  disabled={!driftResult || isLoading}
                  className="w-full bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs uppercase tracking-wider py-2 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  {isLoading ? "Querying AIS..." : "Discover Vessels"}
                </button>
              </div>
            ) : !attributionResult ? (
              <button 
                onClick={handleEvaluate}
                disabled={isLoading}
                className="w-full bg-[#00647C] hover:bg-[#005063] text-white font-bold text-xs uppercase tracking-wider py-2 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                {isLoading ? "Evaluating..." : "Evaluate Attribution"}
              </button>
            ) : (
              <div className="bg-surface-container border border-outline-variant rounded p-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant block mb-1">Ranking Methodology</span>
                <span className="text-[9px] text-on-surface block leading-tight">{attributionResult.ranking_methodology}</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-lowest">
            {displayCandidates.map((cand, idx) => {
              const isSelected = selectedMmsi === cand.vessel_identity.mmsi;
              return (
                <div 
                  key={cand.vessel_identity.mmsi} 
                  onClick={() => setSelectedMmsi(cand.vessel_identity.mmsi)} 
                  className={`cursor-pointer p-3 border rounded transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm text-on-surface">{cand.vessel_identity.name || "UNKNOWN VESSEL"}</span>
                    {attributionResult && idx === 0 && (
                      <span className="text-[9px] bg-[#eab308]/20 text-[#8c6b22] border border-[#eab308]/50 px-1.5 py-0.5 rounded font-bold uppercase">Highest Ranked</span>
                    )}
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] w-fit bg-surface-container border border-outline px-1.5 py-0.5 rounded text-on-surface-variant font-mono">MMSI: {cand.vessel_identity.mmsi}</span>
                      {cand._rawTrack?.provenance?.mode === "USER_PROVIDED_AIS" && (
                        <span className="text-[8px] w-fit font-bold uppercase tracking-widest bg-[#00647C]/20 text-[#00647C] px-1 py-0.5 rounded">USER PROVIDED AIS</span>
                      )}
                    </div>
                    {attributionResult && (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold uppercase text-on-surface-variant">Compatibility Score</span>
                        <span className="text-sm font-bold text-[#00647C]">{cand.evidence_ranking_score}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: Map Space (Empty to let map show through) */}
        <div className="flex-1 h-full relative">
        </div>

        {/* RIGHT COLUMN: Detailed Profile */}
        {selectedCandidate && attributionResult && (
          <div className="w-[480px] h-full flex flex-col pointer-events-auto border-l border-outline-variant bg-surface shrink-0 shadow-sm">
            <div className="bg-[#eab308]/10 p-2 text-center border-b border-[#eab308]/30">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#8c6b22]">Compatibility ranking, not proof of responsibility.</span>
            </div>
            <div className="p-4 border-b border-outline-variant bg-surface-container-lowest relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#00647C]"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-1">{selectedCandidate.vessel_identity.name || "UNKNOWN"}</h3>
                  <span className="font-mono text-[10px] font-medium text-on-surface-variant block uppercase tracking-wider">MMSI {selectedCandidate.vessel_identity.mmsi} • FLAG {selectedCandidate.vessel_identity.flag || "N/A"}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-on-surface-variant mb-1">Compatibility Score</span>
                  <span className="text-3xl font-bold text-[#00647C] leading-none">{selectedCandidate.evidence_ranking_score}</span>
                </div>
              </div>
              
              <div className="flex gap-4 p-3 bg-surface border border-outline-variant rounded text-center items-center justify-between">
                <div>
                  <span className="block text-lg font-bold text-[#00647C]">{selectedCandidate.supporting_count}</span>
                  <span className="text-[9px] font-bold uppercase text-on-surface-variant tracking-wider">Supporting</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-on-surface-variant">{selectedCandidate.neutral_count}</span>
                  <span className="text-[9px] font-bold uppercase text-on-surface-variant tracking-wider">Neutral</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-error">{selectedCandidate.contradicting_count}</span>
                  <span className="text-[9px] font-bold uppercase text-on-surface-variant tracking-wider">Contradict</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-on-surface-variant/50">{selectedCandidate.unavailable_count}</span>
                  <span className="text-[9px] font-bold uppercase text-on-surface-variant tracking-wider">Unavailable</span>
                </div>
              </div>
              
              <div className="mt-3 flex justify-between items-center text-[10px] font-mono text-on-surface-variant">
                <span>Evidence Coverage: <span className="font-bold text-on-surface">{selectedCandidate.evidence_coverage}</span></span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-surface-container-lowest p-4 flex flex-col gap-3">
              <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant block mb-1">Six-Factor Breakdown</span>
              
              {selectedCandidate.factors.map(factor => (
                <div key={factor.factor_name} className="flex flex-col border border-outline-variant rounded bg-surface overflow-hidden">
                  <button 
                    onClick={() => toggleFactor(factor.factor_name)}
                    className="flex justify-between items-center p-3 hover:bg-surface-container-lowest transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase text-on-surface tracking-wider">{factor.factor_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${getStatusColor(factor.status)}`}>
                        {getStatusIcon(factor.status)}
                        <span className="text-[9px] font-bold tracking-widest uppercase">{factor.status}</span>
                      </div>
                      <span className="text-on-surface-variant font-bold text-xs">{expandedFactors[factor.factor_name] ? '-' : '+'}</span>
                    </div>
                  </button>
                  
                  {expandedFactors[factor.factor_name] && (
                    <div className="p-3 pt-0 border-t border-outline-variant/50">
                      <div className="mt-2">
                        <span className="text-sm text-on-surface block mb-1">{factor.observation}</span>
                        <span className="text-xs text-on-surface-variant block">{factor.interpretation}</span>
                      </div>
                      
                      <div className="mt-3 flex flex-col gap-1 bg-surface-container-lowest p-2 rounded border border-outline-variant/50">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono text-on-surface-variant uppercase">Source</span>
                          <span className="text-[9px] font-mono text-on-surface font-bold">{factor.evidence_source}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono text-on-surface-variant uppercase">Provenance</span>
                          <span className="text-[9px] font-mono text-[#8c6b22] font-bold bg-[#ffeedd] px-1 rounded">{factor.provenance}</span>
                        </div>
                        {factor.limitations && (
                          <div className="flex items-start gap-1 mt-1 pt-1 border-t border-outline-variant/50">
                            <AlertTriangle className="w-3 h-3 text-[#e5ab35] shrink-0 mt-0.5" />
                            <span className="text-[9px] font-medium text-on-surface-variant leading-tight">{factor.limitations}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-3 border-t border-outline-variant bg-surface text-center">
               <span className="text-[9px] text-on-surface-variant block">{attributionResult.limitations}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
