import os
import sys
import json
import joblib
import numpy as np
from pathlib import Path
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.model_selection import GridSearchCV, PredefinedSplit
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

from app.services.look_alike_service import LookAlikeService

VALIDATION_DIR = Path(__file__).parent / "data" / "validation"
TRAIN_MANIFEST = VALIDATION_DIR / "phase_11e_train_manifest.json"
VAL_MANIFEST = VALIDATION_DIR / "phase_11e_val_manifest.json"
TEST_MANIFEST = VALIDATION_DIR / "phase_11d_manifest.json"
MODEL_SAVE_PATH = Path(__file__).parent / "data" / "models" / "lookalike_svm_real_v1.joblib"

def load_data(manifest_path, look_alike_service):
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
        
    X = []
    y = []
    for sample in manifest:
        img_path = sample["source_image"]
        true_label = sample["label"]
        img = Image.open(img_path).convert('L')
        img_array = np.array(img, dtype=np.uint8)
        
        features = look_alike_service._extract_features(img_array)
        X.append(features)
        y.append(1 if true_label == "OIL" else 0)
        
    return np.array(X), np.array(y)

def print_metrics(y_true, y_pred, name=""):
    print(f"\n--- {name} ---")
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    acc = (tp + tn) / len(y_true)
    oil_prec = tp / (tp + fp) if (tp + fp) > 0 else 0
    oil_rec = tp / (tp + fn) if (tp + fn) > 0 else 0
    oil_f1 = 2 * (oil_prec * oil_rec) / (oil_prec + oil_rec) if (oil_prec + oil_rec) > 0 else 0
    fpr = fp / (tn + fp) if (tn + fp) > 0 else 0
    
    water_prec = tn / (tn + fn) if (tn + fn) > 0 else 0
    water_rec = tn / (tn + fp) if (tn + fp) > 0 else 0
    water_f1 = 2 * (water_prec * water_rec) / (water_prec + water_rec) if (water_prec + water_rec) > 0 else 0
    macro_f1 = (oil_f1 + water_f1) / 2
    
    print(f"Accuracy: {acc:.4f}")
    print(f"Macro F1: {macro_f1:.4f}")
    print(f"Oil Precision: {oil_prec:.4f}")
    print(f"Oil Recall: {oil_rec:.4f}")
    print(f"Oil F1: {oil_f1:.4f}")
    print(f"Look-alike FPR: {fpr:.4f}")
    print(f"Confusion Matrix (TN, FP, FN, TP): {tn}, {fp}, {fn}, {tp}")

def main():
    print("Loading data and extracting HOG features...")
    service = LookAlikeService()
    
    X_train, y_train = load_data(TRAIN_MANIFEST, service)
    X_val, y_val = load_data(VAL_MANIFEST, service)
    
    # We load ONLY Track A patches (image domain) for apples-to-apples comparison on the Phase 11D hold-out
    with open(TEST_MANIFEST, 'r') as f:
        test_manifest = json.load(f)
    test_manifest_a = [s for s in test_manifest if s.get("track_a")]
    
    X_test = []
    y_test = []
    for sample in test_manifest_a:
        img_path = sample["source_image"]
        true_label = sample["label"]
        img = Image.open(img_path).convert('L')
        img_array = np.array(img, dtype=np.uint8)
        features = service._extract_features(img_array)
        X_test.append(features)
        y_test.append(1 if true_label == "OIL" else 0)
    
    X_test = np.array(X_test)
    y_test = np.array(y_test)
    
    print(f"Train: {X_train.shape[0]} samples")
    print(f"Val: {X_val.shape[0]} samples")
    print(f"Test (Phase 11D hold-out Track A): {X_test.shape[0]} samples")
    
    print("\n[EVALUATING SYNTHETIC BASELINE]")
    service._load_model()
    baseline_model = service._model
    y_test_pred_baseline = baseline_model.predict(X_test)
    print_metrics(y_test, y_test_pred_baseline, "Phase 11D Test Set - Synthetic Baseline")
    
    X_combined = np.vstack((X_train, X_val))
    y_combined = np.hstack((y_train, y_val))
    
    test_fold = np.concatenate([-1 * np.ones(len(y_train)), np.zeros(len(y_val))])
    ps = PredefinedSplit(test_fold)
    
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('svm', SVC(kernel='rbf', class_weight='balanced', random_state=42))
    ])
    
    param_grid = {
        'svm__C': [0.1, 1, 10],
        'svm__gamma': ['scale', 0.01]
    }
    
    print("\n[HYPERPARAMETER SEARCH ON TRAIN/VAL]")
    search = GridSearchCV(pipeline, param_grid, cv=ps, scoring='f1_macro')
    search.fit(X_combined, y_combined)
    
    print(f"Best parameters selected by Val Set: {search.best_params_}")
    
    print("\n[FITTING FINAL MODEL ON TRAIN+VAL]")
    final_model = search.best_estimator_
    final_model.fit(X_combined, y_combined)
    
    MODEL_SAVE_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(final_model, MODEL_SAVE_PATH)
    print(f"Saved real-trained model to {MODEL_SAVE_PATH}")
    
    print("\n[EVALUATING REAL-TRAINED MODEL]")
    y_test_pred_real = final_model.predict(X_test)
    print_metrics(y_test, y_test_pred_real, "Phase 11D Test Set - Real-Trained SVM")

if __name__ == "__main__":
    main()
