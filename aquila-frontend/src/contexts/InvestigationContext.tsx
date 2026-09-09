"use client";

import React, { createContext, useContext, useState } from "react";
import { SatelliteScene, Slick, LookAlikeAssessment, EvidenceFusionResult, DriftResult, ForecastResult, DriftScenario, VesselCandidate, OriginEstimate, AttributionResult, CounterfactualScenario, CounterfactualResult, Investigation } from "@/lib/api/types";
import { satelliteApi } from "@/lib/api/satellite";
import { analysisApi } from "@/lib/api/analysis";
import { driftApi } from "@/lib/api/drift";
import { investigationsApi } from "@/lib/api/investigations";

interface InvestigationState {
  investigation: Investigation | null;
  scene: SatelliteScene | null;
  candidates: Slick[];
  selectedCandidateId: string | null;
  assessments: Record<string, LookAlikeAssessment>;
  fusionResults: Record<string, EvidenceFusionResult>;
  driftResults: Record<string, DriftResult>;
  forecastResults: Record<string, ForecastResult>;
  vesselCandidates: Record<string, VesselCandidate[]>;
  attributionResults: Record<string, AttributionResult>;
  counterfactualResults: Record<string, CounterfactualResult>;
  
  isLoading: boolean;
  error: string | null;
  
  setSelectedCandidateId: (id: string | null) => void;
  
  loadInvestigation: (id: string) => Promise<void>;
  assessCandidate: (slickId: string) => Promise<void>;
  fuseEvidence: (slickId: string) => Promise<void>;
  runHindcast: (scenario: DriftScenario) => Promise<void>;
  runForecast: (scenario: DriftScenario, originId: string) => Promise<void>;
  findVesselCandidates: (investigationId: string, scenarioId: string, origin: OriginEstimate, start: string, end: string, mode?: string) => Promise<void>;
  evaluateAttribution: (investigationId: string, scenarioId: string, origin: OriginEstimate, drift: DriftResult, candidates: VesselCandidate[]) => Promise<void>;
  runCounterfactualSimulation: (scenario: CounterfactualScenario) => Promise<void>;
}

const InvestigationContext = createContext<InvestigationState | undefined>(undefined);

export function InvestigationProvider({ children }: { children: React.ReactNode }) {
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [scene, setScene] = useState<SatelliteScene | null>(null);
  const [candidates, setCandidates] = useState<Slick[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Record<string, LookAlikeAssessment>>({});
  const [fusionResults, setFusionResults] = useState<Record<string, EvidenceFusionResult>>({});
  const [driftResults, setDriftResults] = useState<Record<string, DriftResult>>({});
  const [forecastResults, setForecastResults] = useState<Record<string, ForecastResult>>({});
  const [vesselCandidates, setVesselCandidates] = useState<Record<string, VesselCandidate[]>>({});
  const [attributionResults, setAttributionResults] = useState<Record<string, AttributionResult>>({});
  const [counterfactualResults, setCounterfactualResults] = useState<Record<string, CounterfactualResult>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvestigation = async (invId: string) => {
    if (investigation?.id === invId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const inv = await investigationsApi.getInvestigation(invId);
      setInvestigation(inv);

      if (inv.source_product_id) {
        const fetchedScene = await satelliteApi.getScene(inv.source_product_id);
        setScene(fetchedScene);
        
        if (fetchedScene.is_processed) {
          const fetchedCandidates = await satelliteApi.getCandidates(fetchedScene.id);
          setCandidates(fetchedCandidates);
          
          if (fetchedCandidates.length > 0 && !selectedCandidateId) {
            setSelectedCandidateId(fetchedCandidates[0].id);
          }
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
    if (!scene || !investigation) return;
    setIsLoading(true);
    setError(null);
    try {
      const assessment = assessments[slickId];
      const result = await analysisApi.fuseEvidence({
        investigation_id: investigation.id,
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

  const findVesselCandidates = async (investigationId: string, scenarioId: string, origin: OriginEstimate, start: string, end: string, mode: string = "GFW") => {
    setIsLoading(true);
    setError(null);
    try {
      const { aisApi } = await import('@/lib/api/ais');
      const candidates = await aisApi.discoverCandidates(investigationId, origin, start, end, mode);
      setVesselCandidates(prev => ({ ...prev, [scenarioId]: candidates }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to find vessel candidates");
    } finally {
      setIsLoading(false);
    }
  };

  const evaluateAttribution = async (investigationId: string, scenarioId: string, origin: OriginEstimate, drift: DriftResult, candidates: VesselCandidate[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const { attributionApi } = await import('@/lib/api/attribution');
      const result = await attributionApi.evaluateCandidates(investigationId, origin, drift, candidates);
      setAttributionResults(prev => ({ ...prev, [scenarioId]: result }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to evaluate attribution");
    } finally {
      setIsLoading(false);
    }
  };

  const runCounterfactualSimulation = async (scenario: CounterfactualScenario) => {
    setIsLoading(true);
    setError(null);
    try {
      const { simulationApi } = await import('@/lib/api/simulation');
      const result = await simulationApi.runCounterfactual(scenario);
      setCounterfactualResults(prev => ({ ...prev, [scenario.candidate_vessel_id]: result }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run simulation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <InvestigationContext.Provider value={{
      investigation,
      scene,
      candidates,
      selectedCandidateId,
      assessments,
      fusionResults,
      driftResults,
      forecastResults,
      vesselCandidates,
      attributionResults,
      counterfactualResults,
      isLoading,
      error,
      setSelectedCandidateId,
      loadInvestigation,
      assessCandidate,
      fuseEvidence,
      runHindcast,
      runForecast,
      findVesselCandidates,
      evaluateAttribution,
      runCounterfactualSimulation
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
