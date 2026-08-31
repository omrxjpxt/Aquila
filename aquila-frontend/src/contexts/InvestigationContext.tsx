"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SatelliteScene, Slick, LookAlikeAssessment, EvidenceFusionResult } from "@/lib/api/types";
import { satelliteApi } from "@/lib/api/satellite";
import { analysisApi } from "@/lib/api/analysis";

interface InvestigationState {
  scene: SatelliteScene | null;
  candidates: Slick[];
  selectedCandidateId: string | null;
  assessments: Record<string, LookAlikeAssessment>; // keyed by slick_id
  fusionResults: Record<string, EvidenceFusionResult>; // keyed by slick_id
  
  isLoading: boolean;
  error: string | null;
  
  setScene: (scene: SatelliteScene) => void;
  setCandidates: (candidates: Slick[]) => void;
  setSelectedCandidateId: (id: string | null) => void;
  
  loadInvestigation: (sceneId: string) => Promise<void>;
  assessCandidate: (slickId: string) => Promise<void>;
  fuseEvidence: (slickId: string) => Promise<void>;
}

const InvestigationContext = createContext<InvestigationState | undefined>(undefined);

export function InvestigationProvider({ children }: { children: React.ReactNode }) {
  const [scene, setScene] = useState<SatelliteScene | null>(null);
  const [candidates, setCandidates] = useState<Slick[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Record<string, LookAlikeAssessment>>({});
  const [fusionResults, setFusionResults] = useState<Record<string, EvidenceFusionResult>>({});
  
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

  return (
    <InvestigationContext.Provider value={{
      scene,
      candidates,
      selectedCandidateId,
      assessments,
      fusionResults,
      isLoading,
      error,
      setScene,
      setCandidates,
      setSelectedCandidateId,
      loadInvestigation,
      assessCandidate,
      fuseEvidence
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
