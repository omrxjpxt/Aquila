import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.attribution_service import AttributionService
from app.schemas.drift import DriftResult, OriginEstimate, DriftProvenance
from app.schemas.ais import VesselCandidate, VesselIdentity, AISTrack, AISProvenance

def main():
    print("=" * 60)
    print("AQUILA ATTRIBUTION PROBE (PHASE 14C)")
    print("ALL CANDIDATES BELOW ARE SYNTHETIC TEST DATA")
    print("=" * 60)

    service = AttributionService()

    # Create a LIVE drift result
    drift = DriftResult(
        id="test-drift",
        scenario_id="scenario",
        slick_id="slick",
        run_time=datetime.utcnow().isoformat(),
        trajectories=[],
        provenance=DriftProvenance(
            mode="LIVE",
            engine="OceanDrift",
            forcing_provider="Open-Meteo",
            model_status="SUCCESS",
            limitations=""
        )
    )

    def make_cand(mmsi, name, inside, relevant, gap_hours, source):
        quality = "GOOD" if gap_hours < 1 else ("MODERATE" if gap_hours < 4 else "POOR")
        return VesselCandidate(
            id=f"cand-{mmsi}",
            investigation_id="test",
            identity=VesselIdentity(mmsi=mmsi, imo=None, name=name, vessel_type=None, flag=None),
            track=AISTrack(
                mmsi=mmsi,
                geometry={"type": "MultiLineString", "coordinates": []},
                gap_geometry=None,
                positions=[],
                gaps=[],
                total_observations=100,
                longest_gap_hours=gap_hours,
                coverage_quality=quality
            ),
            spatially_relevant=relevant or inside,
            temporally_relevant=relevant or inside,
            closest_approach_meters=0 if inside else 5000,
            inside_origin_region=inside,
            provenance=AISProvenance(source=source, mode=source, retrieval_time=datetime.utcnow().isoformat(), limitations="")
        )

    # 1. Perfect Candidate (Highest Ranked)
    cand_perfect = make_cand("111111111", "[TEST DATA] Perfect Match", True, True, 0.5, "USER_PROVIDED_AIS")
    
    # 2. Tied Candidate (Same score as cand_perfect)
    cand_tied = make_cand("222222222", "[TEST DATA] Perfect Tied", True, True, 0.5, "USER_PROVIDED_AIS")
    
    # 3. AIS Gap Candidate (Should not be penalized, just UNAVAILABLE)
    cand_gap = make_cand("333333333", "[TEST DATA] AIS Gap", True, True, 5.0, "USER_PROVIDED_AIS")
    
    # 4. Contradicting Candidate (Absent from region)
    cand_contra = make_cand("444444444", "[TEST DATA] Contradicting", False, False, 0.5, "MOCK")

    candidates = [cand_perfect, cand_tied, cand_gap, cand_contra]

    result = service.evaluate("test-inv", None, drift, candidates)

    print(f"\nEvaluating {len(candidates)} candidates against LIVE drift evidence...")
    print(f"Ranking Methodology: {result.ranking_methodology}\n")

    for idx, c in enumerate(result.candidates):
        is_tied = idx > 0 and c.evidence_ranking_score == result.candidates[idx-1].evidence_ranking_score
        rank_str = f"#{idx+1}" if not is_tied else f"TIED #{idx}"
        
        print(f"[{rank_str}] {c.vessel_identity.name} (MMSI: {c.vessel_identity.mmsi})")
        print(f"    Compatibility Score: {c.evidence_ranking_score}")
        print(f"    Evidence Coverage: {c.evidence_coverage}")
        print(f"    Supporting: {c.supporting_count} | Neutral: {c.neutral_count} | Unavailable: {c.unavailable_count} | Contradicting: {c.contradicting_count}")
        print("    Factors:")
        for f in c.factors:
            score_delta = ""
            if f.status == "SUPPORTING": 
                score_delta = "+2"
            elif f.status == "CONTRADICTING": 
                score_delta = "-2"
            elif f.status == "NEUTRAL": 
                score_delta = " 0"
            elif f.status == "UNAVAILABLE": 
                score_delta = " 0"
            
            print(f"      - {f.factor_name.ljust(25)} {score_delta}  {f.status.ljust(15)} : {f.observation}")
        print("-" * 60)

    # Now test with MOCK drift
    print("\n\n" + "=" * 60)
    print("Testing with DEMO_MOCK Drift (Drift score should be UNAVAILABLE)")
    print("=" * 60)
    drift.provenance.mode = "DEMO_MOCK"
    drift.provenance.engine = "mock-engine"
    
    result_mock = service.evaluate("test-inv", None, drift, [cand_perfect])
    c_mock = result_mock.candidates[0]
    print(f"[1] {c_mock.vessel_identity.name} (MMSI: {c_mock.vessel_identity.mmsi})")
    print(f"    Compatibility Score: {c_mock.evidence_ranking_score} (Expected 6 instead of 8)")
    for f in c_mock.factors:
        if f.factor_name == "Drift Compatibility":
            print(f"      - {f.factor_name.ljust(25)}  0  {f.status.ljust(15)} : {f.observation}")

if __name__ == "__main__":
    main()
