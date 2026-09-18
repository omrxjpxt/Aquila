"""
LookAlikeService — Phase 4B: Oil-vs-Look-Alike Classification

This service implements the real look-alike assessment contract.
It loads a trained model artifact and classifies candidate dark patches
from Phase 4A as OIL_LIKE, LOOKALIKE, or UNCERTAIN.

Flow:
  Phase 4A candidate → patch extraction → preprocessing → model inference → LookAlikeAssessment

The model is a lightweight HOG+SVM baseline trained on synthetic SAR data.
It does NOT produce calibrated probabilities. The raw_score is the SVM
decision function value (distance from hyperplane).

IMPORTANT:
  - This service only answers: "Does this patch look like oil or a look-alike?"
  - Environmental context (wind, optical, temporal) is NOT incorporated here.
  - The result is NOT a final AQUILA oil spill determination.
"""

import os
import numpy as np
from PIL import Image
from datetime import datetime
from typing import Optional

from app.schemas.look_alike import (
    LookAlikeAssessment, LookAlikeClass, PatchMetadata, LookAlikeRequest
)
from app.schemas.slick import Slick
from app.core.config import settings


# Feature extraction parameters (must match training)
HOG_ORIENTATIONS = 9
HOG_PIXELS_PER_CELL = (32, 32)
HOG_CELLS_PER_BLOCK = (2, 2)
RESIZE_DIM = (128, 128)

MODEL_VERSION = "lookalike_svm_v1"


class LookAlikeService:
    """
    Service for classifying candidate dark regions as oil-like or look-alike.

    CORE WORKFLOW: VALIDATE
    """

    def __init__(self):
        self._model = None
        
        # Default to real-trained model, allow override via settings/env
        self._model_path = os.environ.get(
            "LOOKALIKE_MODEL_PATH",
            settings.LOOKALIKE_MODEL_PATH
        )
        self._uncertainty_margin = float(os.environ.get(
            "LOOKALIKE_UNCERTAINTY_MARGIN", "0.3"
        ))
        
        # Determine metadata based on configured model
        self._is_real_model = "lookalike_svm_real_v1" in self._model_path
        
        if self._is_real_model:
            self._model_name = "HOG + RBF SVM"
            self._model_version = "lookalike_svm_real_v1"
            self._training_domain = "REAL_SENTINEL_1_DERIVED"
            self._training_representation = "PANGAEA_8BIT_JPEG"
            self._evaluation_domain = "REAL_SENTINEL_1_DERIVED / LIVE_CDSE"
            self._evaluation_status = "REAL_DATA_TRAINED"
        else:
            self._model_name = "HOG + RBF SVM"
            self._model_version = "lookalike_svm_v1"
            self._training_domain = "SYNTHETIC"
            self._training_representation = "SYNTHETIC_FLOAT"
            self._evaluation_domain = "REAL_SENTINEL_1_DERIVED / LIVE_CDSE"
            self._evaluation_status = "SYNTHETIC_TRAINED"

    def _load_model(self):
        """Load the trained model artifact from disk."""
        if self._model is not None:
            return

        model_path = self._model_path
        if not os.path.isabs(model_path):
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            cand_path = os.path.join(backend_dir, model_path)
            if os.path.exists(cand_path):
                model_path = cand_path

        if not os.path.exists(model_path):
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            cand_path = os.path.join(backend_dir, "data", "models", os.path.basename(model_path))
            if os.path.exists(cand_path):
                model_path = cand_path

        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model artifact not found at {self._model_path}. "
                f"Run ml/train_lookalike.py first."
            )

        import joblib
        self._model = joblib.load(model_path)

    def _extract_features(self, img_array: np.ndarray) -> np.ndarray:
        """
        Extract HOG + intensity features from a grayscale image array.
        Must match the feature extraction used during training.
        """
        from skimage.feature import hog

        # Resize
        img = Image.fromarray(img_array.astype(np.uint8), mode='L').resize(RESIZE_DIM)
        arr = np.array(img, dtype=np.float32) / 255.0

        hog_features = hog(
            arr,
            orientations=HOG_ORIENTATIONS,
            pixels_per_cell=HOG_PIXELS_PER_CELL,
            cells_per_block=HOG_CELLS_PER_BLOCK,
            block_norm='L2-Hys',
            feature_vector=True
        )

        stats = np.array([
            arr.mean(),
            arr.std(),
            np.percentile(arr, 10),
            np.percentile(arr, 90),
            arr.max() - arr.min(),
        ])

        return np.concatenate([hog_features, stats])

    def _extract_patch_from_scene(
        self, scene_path: str, slick: Slick
    ) -> tuple:
        """
        Extract the image patch for a candidate slick from the processed scene.
        Returns (patch_array, patch_metadata).
        """
        import rasterio

        with rasterio.open(scene_path) as src:
            data = src.read(1)

            # Get bounding box from slick geometry
            geom = slick.geometry
            if isinstance(geom, dict) and 'coordinates' in geom:
                coords = np.array(geom['coordinates'][0])
                min_x, min_y = coords.min(axis=0)
                max_x, max_y = coords.max(axis=0)
            else:
                # Fallback: use center region
                h, w = data.shape
                min_x, min_y = w // 4, h // 4
                max_x, max_y = 3 * w // 4, 3 * h // 4

            # Convert geo coords to pixel coords via inverse transform
            from rasterio.transform import rowcol
            try:
                row_min, col_min = rowcol(src.transform, min_x, max_y)
                row_max, col_max = rowcol(src.transform, max_x, min_y)
                if row_min > row_max:
                    row_min, row_max = row_max, row_min
                if col_min > col_max:
                    col_min, col_max = col_max, col_min
            except Exception:
                # Fallback to direct pixel indexing
                row_min, col_min = 0, 0
                row_max, col_max = data.shape

            # Clamp to image bounds
            row_min = max(0, min(data.shape[0], int(row_min)))
            row_max = max(0, min(data.shape[0], int(row_max)))
            col_min = max(0, min(data.shape[1], int(col_min)))
            col_max = max(0, min(data.shape[1], int(col_max)))

            # Ensure minimum patch size and handle coordinates near edges or outside raster
            if row_max - row_min < 32 or col_max - col_min < 32:
                cy = (row_min + row_max) // 2 if row_max > row_min else data.shape[0] // 2
                cx = (col_min + col_max) // 2 if col_max > col_min else data.shape[1] // 2
                half_h = 64
                half_w = 64
                row_min = max(0, cy - half_h)
                row_max = min(data.shape[0], cy + half_h)
                col_min = max(0, cx - half_w)
                col_max = min(data.shape[1], cx + half_w)

            # Final check to guarantee non-empty patch bounds
            if row_max <= row_min or col_max <= col_min:
                row_min, row_max = 0, data.shape[0]
                col_min, col_max = 0, data.shape[1]

            patch = data[row_min:row_max, col_min:col_max]

            # If still empty (e.g. degenerate 0-dim raster), construct non-empty array
            if patch.size == 0:
                patch = np.zeros((RESIZE_DIM[0], RESIZE_DIM[1]), dtype=np.float32)

            # Normalize to 0-255 for feature extraction
            p_min = np.nanmin(patch) if not np.all(np.isnan(patch)) else 0.0
            p_max = np.nanmax(patch) if not np.all(np.isnan(patch)) else 1.0
            if p_max > p_min:
                clean_patch = np.nan_to_num(patch, nan=p_min)
                patch = ((clean_patch - p_min) / (p_max - p_min) * 255).astype(np.uint8)
            else:
                patch = np.zeros_like(patch, dtype=np.uint8)

            meta = PatchMetadata(
                source_scene_id=slick.source_scene_id,
                bbox=[float(col_min), float(row_min), float(col_max), float(row_max)],
                patch_width=max(1, col_max - col_min),
                patch_height=max(1, row_max - row_min),
                extraction_method="bounding_box_from_geometry"
            )

            return patch, meta

    async def assess_candidate(
        self,
        slick: Slick,
        scene_path: Optional[str] = None,
        patch_path: Optional[str] = None
    ) -> LookAlikeAssessment:
        """
        Classify a candidate slick as OIL_LIKE, LOOKALIKE, or UNCERTAIN.

        Args:
            slick: The candidate Slick from Phase 4A detection.
            scene_path: Path to the processed scene raster.
            patch_path: Optional direct path to a patch image (for testing).

        Returns:
            LookAlikeAssessment with the model's structured output.
        """
        self._load_model()

        # Extract patch
        if patch_path and os.path.exists(patch_path):
            img = Image.open(patch_path).convert('L')
            patch_array = np.array(img)
            patch_meta = PatchMetadata(
                source_scene_id=slick.source_scene_id,
                patch_width=patch_array.shape[1],
                patch_height=patch_array.shape[0],
                extraction_method="direct_file"
            )
        elif scene_path:
            patch_array, patch_meta = self._extract_patch_from_scene(scene_path, slick)
        else:
            raise ValueError("Either scene_path or patch_path must be provided")

        if patch_array.size == 0:
            patch_array = np.zeros(RESIZE_DIM, dtype=np.uint8)

        # Extract features
        features = self._extract_features(patch_array).reshape(1, -1)

        # Inference
        raw_score = float(self._model.decision_function(features)[0])
        binary_pred = int(self._model.predict(features)[0])

        # Determine class with uncertainty
        if abs(raw_score) < self._uncertainty_margin:
            predicted_class = LookAlikeClass.UNCERTAIN
        elif binary_pred == 1:
            predicted_class = LookAlikeClass.OIL_LIKE
        else:
            predicted_class = LookAlikeClass.LOOKALIKE

        return LookAlikeAssessment(
            slick_id=slick.id,
            predicted_class=predicted_class,
            raw_score=raw_score,
            uncertainty_margin=self._uncertainty_margin,
            model_name=self._model_name,
            model_version=self._model_version,
            model_type="HOG+SVM",
            training_domain=self._training_domain,
            training_representation=self._training_representation,
            evaluation_domain=self._evaluation_domain,
            evaluation_status=self._evaluation_status,
            artifact_identifier=self._model_path,
            patch_metadata=patch_meta,
            assessed_at=datetime.utcnow()
        )
