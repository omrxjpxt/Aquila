import os
import json
import random
import requests
import pandas as pd
from io import StringIO
from pathlib import Path

# Fix random seed for deterministic subset
random.seed(42)

DATASET_URL = "https://doi.pangaea.de/10.1594/PANGAEA.980773?format=textfile"
IMAGE_BASE_URL = "https://download.pangaea.de/dataset/980773/files/"
VALIDATION_DIR = Path(__file__).parent.parent / "data" / "validation"
MANIFEST_FILE = VALIDATION_DIR / "phase_11d_manifest.json"

def main():
    print("Downloading PANGAEA DARTIS_2019 dataset table...")
    response = requests.get(DATASET_URL)
    response.raise_for_status()
    
    # Extract the table content (skip header comments)
    lines = response.text.split('\n')
    header_idx = 0
    for i, line in enumerate(lines):
        if line.startswith('Image set'):
            header_idx = i
            break
            
    csv_data = '\n'.join(lines[header_idx:])
    df = pd.read_csv(StringIO(csv_data), sep='\t')
    
    col_subset = df.columns[0]
    col_img = df.columns[1]
    col_sentinel_id = [c for c in df.columns if 'Sentinel_ID' in c][0]
    
    df = df.dropna(subset=[col_img, col_sentinel_id])
    
    oil_df = df[df[col_subset].str.startswith('o')]
    no_oil_df = df[df[col_subset].str.startswith('n')]
    
    def select_samples(subset_df, n, max_per_scene=1):
        selected = []
        scene_counts = {}
        shuffled = subset_df.sample(frac=1, random_state=42)
        for _, row in shuffled.iterrows():
            scene = row[col_sentinel_id]
            if scene_counts.get(scene, 0) < max_per_scene:
                selected.append(row)
                scene_counts[scene] = scene_counts.get(scene, 0) + 1
            if len(selected) >= n:
                break
        return pd.DataFrame(selected)

    # Note: 30 each might require max_per_scene > 1 if there are fewer than 30 unique scenes
    # We will try max_per_scene=2 just in case
    track_a_oil = select_samples(oil_df, 30, max_per_scene=2)
    track_a_no_oil = select_samples(no_oil_df, 30, max_per_scene=2)
    
    track_b_oil = track_a_oil.head(4)
    track_b_no_oil = track_a_no_oil.head(4)
    
    track_b_ids = set(track_b_oil[col_img]).union(set(track_b_no_oil[col_img]))
    
    manifest = []
    VALIDATION_DIR.mkdir(parents=True, exist_ok=True)
    
    all_selected = pd.concat([track_a_oil, track_a_no_oil])
    
    for _, row in all_selected.iterrows():
        img_filename_raw = row[col_img]
        # Just use the basename for local storage
        img_basename = Path(img_filename_raw).name
        
        is_oil = row[col_subset].startswith('o')
        scene_id = row[col_sentinel_id]
        
        img_url = IMAGE_BASE_URL + img_filename_raw
        img_path = VALIDATION_DIR / img_basename
        
        if not img_path.exists():
            print(f"Downloading {img_filename_raw}...")
            r = requests.get(img_url)
            if r.status_code == 200:
                with open(img_path, 'wb') as f:
                    f.write(r.content)
            else:
                print(f"Failed to download {img_filename_raw} (Status: {r.status_code})")
                continue
                
        manifest.append({
            "sample_id": img_basename,
            "source_dataset": "PANGAEA.980773 DARTIS_2019",
            "label": "OIL" if is_oil else "LOOK_ALIKE",
            "source_image": str(img_path.absolute()),
            "scene_id": scene_id,
            "track_a": True,
            "track_b": img_filename_raw in track_b_ids
        })
        
    with open(MANIFEST_FILE, 'w') as f:
        json.dump(manifest, f, indent=2)
        
    print(f"Manifest created with {len(manifest)} samples at {MANIFEST_FILE}")

if __name__ == "__main__":
    main()
