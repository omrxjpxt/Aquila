from typing import Dict, Any

class InvestigationTriggerPolicy:
    """
    Configurable policy to determine if an anomaly candidate 
    warrants a full forensic investigation.
    """
    
    def __init__(self, target_classes: list[str] = None):
        if target_classes is None:
            self.target_classes = ["OIL_LIKE"]
        else:
            self.target_classes = target_classes

    def should_investigate(self, classification_result: Dict[str, Any]) -> bool:
        """
        Evaluate classification result (and potentially other properties like 
        area, environmental conditions) against the policy.
        
        The classification_result typically contains:
        {
            "patch_id": str,
            "predicted_class": str,
            "score": float
        }
        """
        predicted_class = classification_result.get("predicted_class")
        
        if not predicted_class:
            return False
            
        # For Phase 16B, the MVP trigger is based solely on the predicted class.
        # Future iterations can evaluate raw scores (e.g., score > 1.5) or candidate geometry size.
        return predicted_class in self.target_classes

# Singleton instance for general orchestration use
default_trigger_policy = InvestigationTriggerPolicy()
