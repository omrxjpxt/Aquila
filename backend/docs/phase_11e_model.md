# AQUILA Model Card: Look-Alike Classifier (Real-Trained)

## Model Overview
- **Version:** `lookalike_svm_real_v1`
- **Model Type:** Support Vector Machine (RBF Kernel) with Scikit-learn StandardScaler
- **Feature Representation:** Histogram of Oriented Gradients (HOG) + basic intensity statistics (mean, std, 10th/90th percentiles, range)
- **Input Data Format:** `PANGAEA_8BIT_JPEG` (8-bit grayscale intensity arrays derived from real Sentinel-1)
- **Primary Use Case:** Filtering out ocean look-alikes from true oil slicks in Phase 11E evaluation context.

## Dataset
- **Source:** PANGAEA DARTIS_2019 dataset
- **Labels:** 
  - `OIL`: Ocean patches exhibiting signatures corresponding to verified oil slicks.
  - `LOOK_ALIKE`: Ocean patches exhibiting signatures corresponding to non-oil dark anomalies (e.g. low wind, biological slicks).
- **Dataset Splitting Methodology:**
  - Strict scene-level splitting by `Sentinel_ID` to prevent geographic and temporal data leakage.
  - Phase 11D benchmark scenes (57 scenes, 60 samples) were strictly excluded from the pool prior to any split operations.
- **Split Breakdown (Targets):**
  - **Train:** ~400 Oil, ~400 Look-Alike patches
  - **Validation:** ~100 Oil, ~100 Look-Alike patches
  - **Test (Phase 11D Benchmark):** 30 Oil, 30 Look-Alike patches
  - (Exact numbers are documented during the `build_phase_11e_dataset.py` execution).
- **Random Seed:** 42

## Model Pipeline Configuration
1. **Feature Extractor:** `LookAlikeService._extract_features` (HOG orientations=9, pixels_per_cell=16, cells_per_block=2)
2. **Scaler:** `sklearn.preprocessing.StandardScaler` (Applied to ensure equal scale for HOG vs. intensity statistics, critical for the RBF kernel's distance metrics).
3. **Classifier:** `sklearn.svm.SVC`

## Hyperparameter Search
- **Search Space:** `C` ∈ [0.1, 1, 10], `gamma` ∈ ['scale', 0.01]
- **Methodology:** `GridSearchCV` explicitly constrained via `PredefinedSplit` over the Val set. This guaranteed that the internal cross-validation loop did not randomly interleave patches across train and validation scenes.
- **Selection Metric:** Macro F1

## Limitations and Out-of-Distribution (OOD) Risks
- **Data Representation Shift:** The model is trained on 8-bit JPEG image representations (`PANGAEA_8BIT_JPEG`). Operational use directly querying `CDSE_FLOAT32_LINEAR_SIGMA0` from Sentinel Hub will require mapping the float32 array to 8-bit using the same normalization applied to the PANGAEA dataset.
- **Geographic Coverage:** The model's generalization bounds are restricted to the oceanic and coastal regions available in the DARTIS_2019 dataset.
- **Output Calibration:** `raw_decision_score` is not a strict probability. Output probabilities are not calibrated with Platt scaling due to scene-level cross-validation complexity.

## Phase 11E Results
| Metric | Synthetic Baseline | Real-Trained Model |
|--------|--------------------|--------------------|
| Accuracy | 0.4500 | 0.7333 |
| Macro F1 | 0.3553 | 0.7285 |
| Oil Precision | 0.4717 | 0.8182 |
| Oil Recall | 0.8333 | 0.6000 |
| Oil F1 | 0.6024 | 0.6923 |
| Look-Alike FPR| 0.9333 | 0.1333 |
