"""
Phase 4B: Lightweight Oil-vs-Look-Alike Classifier

STRATEGY: HOG texture features + SVM / Random Forest
WHY:
  - Trains on CPU in seconds/minutes
  - HOG captures edge orientation histograms which are relevant for
    distinguishing smooth oil slicks from textured look-alikes
  - SVM with RBF kernel provides good nonlinear discrimination
  - Fully reproducible (deterministic with fixed random state)
  - Scientifically interpretable (feature importances available)

SPLIT: Scene-wise GroupKFold to prevent data leakage.
  Patches from the same source scene NEVER appear in both train and test.

OUTPUT:
  - Trained model artifact (.joblib)
  - Evaluation metrics (precision, recall, F1, confusion matrix)
  - Per-class performance with emphasis on false-positive analysis

CLASSIFICATION CLASSES:
  OIL_LIKE (1)
  LOOKALIKE (0)
  UNCERTAIN — assigned post-hoc when decision_function margin is below threshold

NOTE: This model classifies synthetic SAR image patches.
It is a baseline and NOT a production oil spill detector.
"""

import os
import json
import time
import numpy as np
from PIL import Image
from skimage.feature import hog
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    classification_report, confusion_matrix,
    precision_score, recall_score, f1_score
)
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib


# ── Configuration ──────────────────────────────────────────────────────────

DATASET_DIR = "data/csiro_synthetic"
MODEL_OUTPUT_DIR = "data/models"
RANDOM_STATE = 42
TEST_SIZE = 0.2
VAL_SIZE = 0.1  # From remaining train

# HOG parameters
HOG_ORIENTATIONS = 9
HOG_PIXELS_PER_CELL = (32, 32)
HOG_CELLS_PER_BLOCK = (2, 2)
RESIZE_DIM = (128, 128)  # Downsample for speed

# Uncertainty threshold: if |decision_function| < this, classify as UNCERTAIN
UNCERTAINTY_MARGIN = 0.3


def extract_features(img_path):
    """
    Extract HOG (Histogram of Oriented Gradients) features from a grayscale patch.

    HOG captures the distribution of edge orientations in local image regions,
    which is effective for distinguishing:
      - Oil: smooth, low-gradient regions with dampened speckle
      - Look-alike: textured regions with more varied edge orientations

    Additional features:
      - Mean intensity (overall brightness)
      - Std intensity (texture roughness proxy)
      - Intensity range (contrast)
    """
    img = Image.open(img_path).convert('L').resize(RESIZE_DIM)
    arr = np.array(img, dtype=np.float32) / 255.0

    # HOG features
    hog_features = hog(
        arr,
        orientations=HOG_ORIENTATIONS,
        pixels_per_cell=HOG_PIXELS_PER_CELL,
        cells_per_block=HOG_CELLS_PER_BLOCK,
        block_norm='L2-Hys',
        feature_vector=True
    )

    # Simple statistical features
    stats = np.array([
        arr.mean(),
        arr.std(),
        np.percentile(arr, 10),
        np.percentile(arr, 90),
        arr.max() - arr.min(),
    ])

    return np.concatenate([hog_features, stats])


def load_dataset(dataset_dir):
    """Load metadata and extract features for the entire dataset."""
    meta_path = os.path.join(dataset_dir, 'metadata.json')
    with open(meta_path) as f:
        metadata = json.load(f)

    features = []
    labels = []
    groups = []  # scene IDs for grouped splitting
    filenames = []

    print("Extracting features from", len(metadata), "patches...")
    t0 = time.time()

    for i, entry in enumerate(metadata):
        fpath = os.path.join(dataset_dir, entry['filename'])
        feat = extract_features(fpath)
        features.append(feat)
        labels.append(entry['label'])
        groups.append(entry['scene_id'])
        filenames.append(entry['filename'])

        if (i + 1) % 200 == 0:
            print("  Processed", i+1, "/", len(metadata), "patches...")

    elapsed = time.time() - t0
    print(f"Feature extraction complete in {elapsed:.1f}s")

    return (
        np.array(features),
        np.array(labels),
        np.array(groups),
        filenames
    )


def scene_wise_split(X, y, groups, test_size=0.2, random_state=42):
    """
    Split data ensuring patches from the same scene stay together.
    This prevents data leakage from shared background/sea-state.
    """
    splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_idx, test_idx = next(splitter.split(X, y, groups))

    # Verify no scene overlap
    train_scenes = set(groups[train_idx])
    test_scenes = set(groups[test_idx])
    assert len(train_scenes & test_scenes) == 0, "Scene leakage detected!"

    print("  Train scenes:", len(train_scenes), ", Test scenes:", len(test_scenes))
    print("  Train samples:", len(train_idx), ", Test samples:", len(test_idx))
    print("  No scene overlap: ✓")

    return train_idx, test_idx


def train_and_evaluate():
    """Full training and evaluation pipeline."""
    os.makedirs(MODEL_OUTPUT_DIR, exist_ok=True)

    # ── Load Data ──
    X, y, groups, filenames = load_dataset(DATASET_DIR)
    print("\nDataset:", len(y), "samples,", len(np.unique(groups)), "scenes")
    print("  Class 0 (LOOKALIKE):", np.sum(y == 0))
    print("  Class 1 (OIL_LIKE): ", np.sum(y == 1))
    print("  Feature dimension:", X.shape[1])

    # ── Scene-wise Split ──
    print("\n── Scene-Wise Train/Test Split ──")
    train_idx, test_idx = scene_wise_split(X, y, groups, test_size=TEST_SIZE)

    # Further split train into train/val (scene-wise)
    X_trainval, y_trainval, g_trainval = X[train_idx], y[train_idx], groups[train_idx]
    X_test, y_test = X[test_idx], y[test_idx]

    print("\n── Scene-Wise Train/Val Split ──")
    tv_train_idx, tv_val_idx = scene_wise_split(
        X_trainval, y_trainval, g_trainval,
        test_size=VAL_SIZE / (1 - TEST_SIZE),
        random_state=RANDOM_STATE + 1
    )
    X_train, y_train = X_trainval[tv_train_idx], y_trainval[tv_train_idx]
    X_val, y_val = X_trainval[tv_val_idx], y_trainval[tv_val_idx]

    print("\nFinal splits:")
    print("  Train:", len(y_train), "(oil:", np.sum(y_train == 1), ", la:", np.sum(y_train == 0), ")")
    print("  Val:  ", len(y_val), "(oil:", np.sum(y_val == 1), ", la:", np.sum(y_val == 0), ")")
    print("  Test: ", len(y_test), "(oil:", np.sum(y_test == 1), ", la:", np.sum(y_test == 0), ")")

    # ── Train SVM ──
    print("\n── Training SVM (RBF kernel) ──")
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('svm', SVC(
            kernel='rbf',
            C=10.0,
            gamma='scale',
            class_weight='balanced',  # Handle class imbalance
            random_state=RANDOM_STATE,
            probability=False  # We use decision_function, not fake probabilities
        ))
    ])

    t0 = time.time()
    pipeline.fit(X_train, y_train)
    train_time = time.time() - t0
    print(f"  Training time: {train_time:.2f}s")

    # ── Evaluate on Validation ──
    print("\n── Validation Results ──")
    val_pred = pipeline.predict(X_val)
    print(classification_report(y_val, val_pred, target_names=['LOOKALIKE', 'OIL_LIKE']))

    # ── Evaluate on Test ──
    print("\n══════════════════════════════════")
    print("══  TEST SET EVALUATION  ══")
    print("══════════════════════════════════")

    test_pred = pipeline.predict(X_test)
    test_scores = pipeline.decision_function(X_test)

    # Apply UNCERTAIN class based on margin
    test_pred_3class = []
    for pred, score in zip(test_pred, test_scores):
        if abs(score) < UNCERTAINTY_MARGIN:
            test_pred_3class.append('UNCERTAIN')
        elif pred == 1:
            test_pred_3class.append('OIL_LIKE')
        else:
            test_pred_3class.append('LOOKALIKE')

    # Binary metrics (ignoring UNCERTAIN for standard metrics)
    print("\n── Binary Metrics (OIL_LIKE vs LOOKALIKE) ──")
    report = classification_report(y_test, test_pred, target_names=['LOOKALIKE', 'OIL_LIKE'], output_dict=True)
    print(classification_report(y_test, test_pred, target_names=['LOOKALIKE', 'OIL_LIKE']))

    cm = confusion_matrix(y_test, test_pred)
    print("Confusion Matrix:")
    print(f"                 Predicted")
    print(f"              LOOKALIKE  OIL_LIKE")
    print(f"  LOOKALIKE   {cm[0][0]:>8}  {cm[0][1]:>8}")
    print(f"  OIL_LIKE    {cm[1][0]:>8}  {cm[1][1]:>8}")

    # Critical error analysis
    tn, fp, fn, tp = cm.ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0  # LOOKALIKE → OIL_LIKE (false alarm)
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0  # OIL_LIKE → LOOKALIKE (missed oil)

    print(f"\n── Critical Error Analysis ──")
    print(f"  False Positive Rate (LOOKALIKE → OIL_LIKE): {fpr:.4f} ({fp} false alarms)")
    print(f"  False Negative Rate (OIL_LIKE → LOOKALIKE): {fnr:.4f} ({fn} missed)")
    print(f"  ⚠  LOOKALIKE→OIL_LIKE errors cause false spill alerts")

    # 3-class distribution
    n_uncertain = test_pred_3class.count('UNCERTAIN')
    n_oil = test_pred_3class.count('OIL_LIKE')
    n_la = test_pred_3class.count('LOOKALIKE')
    print(f"\n── 3-Class Distribution (with UNCERTAIN, margin={UNCERTAINTY_MARGIN}) ──")
    print(f"  OIL_LIKE:   {n_oil}")
    print(f"  LOOKALIKE:  {n_la}")
    print(f"  UNCERTAIN:  {n_uncertain}")

    # ── Save Model ──
    model_path = os.path.join(MODEL_OUTPUT_DIR, "lookalike_svm_v1.joblib")
    joblib.dump(pipeline, model_path)
    print(f"\n  Model saved to: {model_path}")

    # ── Save Evaluation Report ──
    eval_report = {
        'model_version': 'lookalike_svm_v1',
        'model_type': 'SVM (RBF kernel)',
        'feature_type': 'HOG + intensity statistics',
        'hog_params': {
            'orientations': HOG_ORIENTATIONS,
            'pixels_per_cell': list(HOG_PIXELS_PER_CELL),
            'cells_per_block': list(HOG_CELLS_PER_BLOCK),
            'resize': list(RESIZE_DIM),
        },
        'dataset': 'csiro_synthetic',
        'split_strategy': 'scene-wise GroupShuffleSplit',
        'train_size': len(y_train),
        'val_size': len(y_val),
        'test_size': len(y_test),
        'training_time_seconds': round(train_time, 2),
        'uncertainty_margin': UNCERTAINTY_MARGIN,
        'test_metrics': {
            'precision_oil': round(report['OIL_LIKE']['precision'], 4),
            'recall_oil': round(report['OIL_LIKE']['recall'], 4),
            'f1_oil': round(report['OIL_LIKE']['f1-score'], 4),
            'precision_lookalike': round(report['LOOKALIKE']['precision'], 4),
            'recall_lookalike': round(report['LOOKALIKE']['recall'], 4),
            'f1_lookalike': round(report['LOOKALIKE']['f1-score'], 4),
            'accuracy': round(report['accuracy'], 4),
            'macro_f1': round(report['macro avg']['f1-score'], 4),
        },
        'confusion_matrix': {
            'true_negative': int(tn),
            'false_positive': int(fp),
            'false_negative': int(fn),
            'true_positive': int(tp),
        },
        'critical_errors': {
            'false_positive_rate_lookalike_to_oil': round(fpr, 4),
            'false_negative_rate_oil_to_lookalike': round(fnr, 4),
        },
        'three_class_distribution': {
            'OIL_LIKE': n_oil,
            'LOOKALIKE': n_la,
            'UNCERTAIN': n_uncertain,
        },
        'limitations': [
            'Trained on SYNTHETIC data, not real Sentinel-1 observations',
            'HOG features may not capture all SAR-specific texture patterns',
            'Scene-wise split prevents leakage but synthetic scenes may not reflect real diversity',
            'UNCERTAIN threshold is heuristic and not calibrated',
            'No environmental context (wind, optical, temporal) is used',
        ],
        'NOTE': 'This is a BASELINE model. Results should be validated on real data before operational use.'
    }

    eval_path = os.path.join(MODEL_OUTPUT_DIR, "evaluation_report.json")
    with open(eval_path, 'w') as f:
        json.dump(eval_report, f, indent=2)
    print(f"  Evaluation report saved to: {eval_path}")

    return pipeline, eval_report


if __name__ == '__main__':
    train_and_evaluate()
