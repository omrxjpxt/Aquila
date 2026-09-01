"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SatelliteScene, Slick, LookAlikeAssessment, EvidenceFusionResult, DriftResult, ForecastResult, DriftScenario, VesselCandidate, OriginEstimate } from "@/lib/api/types";
import { satelliteApi } from "@/lib/api/satellite";
import { analysisApi } from "@/lib/api/analysis";
import { driftApi } from "@/lib/api/drift";
// aisApi is imported lazily to avoid circular dependencies if any

interface InvestigationState {
  scene: SatelliteScene | null;
  candidates: Slick[];
  selectedCandidateId: string | null;
  assessments: Record<string, LookAlikeAssessment>; // keyed by slick_id
  fusionResults: Record<string, EvidenceFusionResult>; // keyed by slick_id
  driftResults: Record<string, DriftResult>; // keyed by scenario_id
  forecastResults: Record<string, ForecastResult>; // keyed by scenario_id
  vesselCandidates: Record<string, VesselCandidate[]>; // keyed by scenario_id
  
  isLoading: boolean;
  error: string | null;
  
  setScene: (scene: SatelliteScene) => void;
  setCandidates: (candidates: Slick[]) => void;
  setSelectedCandidateId: (id: string | null) => void;
  
  loadInvestigation: (sceneId: string) => Promise<void>;
  assessCandidate: (slickId: string) => Promise<void>;
  fuseEvidence: (slickId: string) => Promise<void>;
  runHindcast: (scenario: DriftScenario) => Promise<void>;
  runForecast: (scenario: DriftScenario, originId: string) => Promise<void>;
  findVesselCandidates: (scenarioId: string, origin: OriginEstimate, start: string, end: string) => Promise<void>;
}

const InvestigationContext = createContext<InvestigationState | undefined>(undefined);

export function InvestigationProvider({ children }: { children: React.ReactNode }) {
  const [scene, setScene] = useState<SatelliteScene | null>(null);
  const [candidates, setCandidates] = useState<Slick[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Record<string, LookAlikeAssessment>>({});
  const [fusionResults, setFusionResults] = useState<Record<string, EvidenceFusionResult>>({});
  const [driftResults, setDriftResults] = useState<Record<string, DriftResult>>({});
  const [forecastResults, setForecastResults] = useState<Record<string, ForecastResult>>({});
  const [vesselCandidates, setVesselCandidates] = useState<Record<string, VesselCandidate[]>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvestigation = async (sceneId: string) => {
    // If we already have this scene fully loaded, do nothing
    if (scene?.id === sceneId && candidates.length > 0) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Scene
      const fetchedScene = await satelliteApi.getScene(sceneId);
      setScene(fetchedScene);
      
      // 2. Fetch Candidates if processed
      if (fetchedScene.is_processed) {
        const fetchedCandidates = await satelliteApi.getCandidates(sceneId);
        setCandidates(fetchedCandidates);
        
        // Auto-select first candidate if none selected
        if (fetchedCandidates.length > 0 && !selectedCandidateId) {
          setSelectedCandidateId(fetchedCandidates[0].id);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load investigation state");
    } finally {
      setIsLoading(false);
    }
  };

  const assessCandidate = async (slickId: string) => {
    if (!scene) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await analysisApi.assessLookAlike({
        slick_id: slickId,
        scene_id: scene.id
      });
      setAssessments(prev => ({ ...prev, [slickId]: result }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run ML assessment");
    } finally {
      setIsLoading(false);
    }
  };

  const fuseEvidence = async (slickId: string) => {
    if (!scene) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const assessment = assessments[slickId];
      const result = await analysisApi.fuseEvidence({
        investigation_id: scene.id,
        scene_id: scene.id,
        slick_id: slickId,
        look_alike_assessment: assessment
      });
      setFusionResults(prev => ({ ...prev, [slickId]: result }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run evidence fusion");
    } finally {
      setIsLoading(false);
    }
  };

  const runHindcast = async (scenario: DriftScenario) => {
    if (!scene) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await driftApi.runHindcast({
        scenario,
        scene_id: scene.id
      });
      setDriftResults(prev => ({ ...prev, [scenario.scenario_id]: result }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run hindcast");
    } finally {
      setIsLoading(false);
    }
  };

  const runForecast = async (scenario: DriftScenario, originId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await driftApi.runForecast({
        scenario,
        origin_id: originId
      });
      setForecastResults(prev => ({ ...prev, [scenario.scenario_id]: result }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run forecast");
    } finally {
      setIsLoading(false);
    }
  };

  const findVesselCandidates = async (scenarioId: string, origin: OriginEstimate, start: string, end: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { aisApi } = await import('@/lib/api/ais');
      const candidates = await aisApi.discoverCandidates(origin, start, end);
      setVesselCandidates(prev => ({ ...prev, [scenarioId]: candidates }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to find vessel candidates");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <InvestigationContext.Provider value={{
      scene,
      candidates,
      selectedCandidateId,
      assessments,
      fusionResults,
      driftResults,
      forecastResults,
      vesselCandidates,
      isLoading,
      error,
      setScene,
      setCandidates,
      setSelectedCandidateId,
      loadInvestigation,
      assessCandidate,
      fuseEvidence,
      runHindcast,
      runForecast,
      findVesselCandidates
    }}>
      {children}
    </InvestigationContext.Provider>
  );
}

export function useInvestigation() {
  const context = useContext(InvestigationContext);
  if (context === undefined) {
    throw new Error("useInvestigation must be used within an InvestigationProvider");
  }
  return context;
}
