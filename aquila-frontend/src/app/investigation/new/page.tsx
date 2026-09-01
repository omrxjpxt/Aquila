"use client";

import { useState } from "react";
import { MapPin, Clock, Radar, RadioTower, Waves, Camera, Play, FolderOpen, Target, UploadCloud, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { satelliteApi } from "@/lib/api/satellite";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { SatelliteScene } from "@/lib/api/types";

export default function NewInvestigationPage() {
  const router = useRouter();
  const { setScene, setCandidates } = useInvestigation();
  
  const [ingestState, setIngestState] = useState<'idle' | 'uploading' | 'processing' | 'ready'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sceneData, setSceneData] = useState<SatelliteScene | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setError(null);
    setIngestState('uploading');
    
    try {
      // 1. Ingest
      const scene = await satelliteApi.ingest(file);
      setSceneData(scene);
      setScene(scene);
      
      // 2. Process
      setIngestState('processing');
      await satelliteApi.processScene(scene.id);
      
      // 3. Candidates
      const candidates = await satelliteApi.getCandidates(scene.id);
      setCandidates(candidates);
      
      setIngestState('ready');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during processing");
      setIngestState('idle');
    }
  };

  const handleUseSample = async () => {
    setError(null);
    setIngestState('uploading');
    
    try {
      // 1. Ingest Sample
      const scene = await satelliteApi.ingestSample();
      setSceneData(scene);
      setScene(scene);
      
      // 2. Process
      setIngestState('processing');
      await satelliteApi.processScene(scene.id);
      
      // 3. Candidates
      const candidates = await satelliteApi.getCandidates(scene.id);
      setCandidates(candidates);
      
      setIngestState('ready');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred using the sample dataset");
      setIngestState('idle');
    }
  };

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
            <p className="text-sm text-on-surface-variant font-medium max-w-2xl leading-relaxed">Initialize a new geospatial analysis workspace. Upload raw SAR imagery or load standard test data.</p>
          </div>
          <button 
            onClick={handleUseSample}
            disabled={ingestState !== 'idle'}
            className="text-[10px] font-bold tracking-widest uppercase border border-outline-variant px-4 py-2 rounded bg-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            Use Sample Scene
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-error/10 border border-error/20 p-4 rounded text-error flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-widest mb-1">Processing Failed</div>
              <div className="text-sm font-medium">{error}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow items-start pb-8">
          
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {ingestState === 'idle' && (
              <label className="border border-dashed border-outline-variant bg-surface-container-lowest hover:bg-primary/5 hover:border-primary transition-all duration-300 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px] group shadow-sm relative">
                <input type="file" className="hidden" accept=".tif,.tiff" onChange={handleFileUpload} />
                <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors border border-outline-variant group-hover:border-primary/30">
                  <UploadCloud className="w-8 h-8 text-on-surface-variant group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Upload Satellite Scene</h3>
                <p className="text-[11px] text-on-surface-variant mb-4 font-medium max-w-md">Drag &amp; drop raw SAR (Sentinel-1) .TIF files here.</p>
                <span className="text-[9px] font-bold tracking-widest text-on-surface-variant px-3 py-1 border border-outline-variant rounded bg-surface-container-low uppercase">SUPPORTED: .TIFF (MAX 5GB)</span>
              </label>
            )}

            {ingestState !== 'idle' && (
              <div className="border border-outline-variant bg-surface-container-lowest rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[200px] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-surface-container-highest">
                  <div className={`h-full bg-primary transition-all duration-1000 ${ingestState === 'uploading' ? 'w-1/3' : ingestState === 'processing' ? 'w-2/3' : 'w-full'}`}></div>
                </div>
                
                {ingestState === 'uploading' && (
                  <>
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <h3 className="text-lg font-bold text-on-surface mb-2 uppercase tracking-widest">INGESTING SCENE</h3>
                    <p className="text-sm text-on-surface-variant font-mono">Parsing metadata and transferring to processing node...</p>
                  </>
                )}
                
                {ingestState === 'processing' && (
                  <>
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <h3 className="text-lg font-bold text-on-surface mb-2 uppercase tracking-widest">PROCESSING SAR PIPELINE</h3>
                    <p className="text-sm text-on-surface-variant font-mono">Speckle filtering, linear-dB conversion, and dark spot detection...</p>
                  </>
                )}

                {ingestState === 'ready' && (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-success mb-4" />
                    <h3 className="text-lg font-bold text-success mb-2 uppercase tracking-widest">DETECTION READY</h3>
                    <p className="text-sm text-on-surface-variant font-mono">Scene processed and candidates extracted successfully.</p>
                  </>
                )}
              </div>
            )}

            {sceneData && (
              <div className="bg-surface border border-outline-variant rounded p-4 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                <h4 className="text-[10px] font-bold tracking-widest text-primary mb-4 flex items-center gap-2 uppercase">
                  <Radar className="w-4 h-4" />
                  INGESTED SCENE METADATA
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[11px]">
                  <div>
                    <span className="text-[9px] font-bold tracking-widest text-on-surface-variant block mb-1 uppercase">SCENE ID</span>
                    <span className="text-on-surface font-bold truncate block" title={sceneData.id}>{sceneData.id}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold tracking-widest text-on-surface-variant block mb-1 uppercase">PROVIDER</span>
                    <span className="text-on-surface font-bold">{sceneData.provider}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold tracking-widest text-on-surface-variant block mb-1 uppercase">ACQUISITION</span>
                    <span className="text-on-surface font-bold">{new Date(sceneData.acquisition_time).toISOString().slice(0,16)}Z</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold tracking-widest text-on-surface-variant block mb-1 uppercase">POLARIZATION</span>
                    <span className="text-on-surface font-bold">{sceneData.polarization}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-bold tracking-widest text-on-surface-variant block mb-1 uppercase">BBOX</span>
                    <span className="text-on-surface font-bold">
                      {sceneData.bbox[0].toFixed(4)}, {sceneData.bbox[1].toFixed(4)} → {sceneData.bbox[2].toFixed(4)}, {sceneData.bbox[3].toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6 h-full">
            <div className="bg-surface border border-outline-variant rounded p-4 flex-grow flex flex-col shadow-sm">
              <h4 className="text-[10px] font-bold tracking-widest text-on-surface-variant mb-4 border-b border-outline-variant pb-2 uppercase">SYSTEM STATUS</h4>
              <div className="flex flex-col gap-3 flex-grow">
                <div className="flex items-center justify-between group bg-surface-container-lowest p-2 rounded border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <Radar className="w-4 h-4 text-primary" />
                    <span className="font-mono text-[11px] font-bold text-on-surface">FastAPI Backend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-widest text-primary uppercase">ONLINE</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between group bg-surface-container-lowest p-2 rounded border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <RadioTower className="w-4 h-4 text-primary" />
                    <span className="font-mono text-[11px] font-bold text-on-surface">Detection Engine</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-widest text-primary uppercase">ONLINE</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-auto pt-4">
              {ingestState === 'ready' && sceneData ? (
                <button 
                  onClick={() => router.push(`/investigation/INC-AQ-001`)}
                  className="w-full bg-primary text-on-primary text-[10px] font-bold tracking-widest uppercase py-3.5 rounded hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Play className="w-4 h-4" fill="currentColor" />
                  OPEN WORKSPACE
                </button>
              ) : (
                <button 
                  disabled
                  className="w-full bg-surface-container-lowest border border-outline-variant text-outline-variant text-[10px] font-bold tracking-widest uppercase py-3.5 rounded flex items-center justify-center gap-2 shadow-sm cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  AWAITING SCENE
                </button>
              )}
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}
