import os
import json
import random
import requests
import pandas as pd
from io import StringIO
from pathlib import Path
from sklearn.model_selection import train_test_split
import asyncio
import aiohttp

random.seed(42)

DATASET_URL = "https://doi.pangaea.de/10.1594/PANGAEA.980773?format=textfile"
IMAGE_BASE_URL = "https://download.pangaea.de/dataset/980773/files/"
VALIDATION_DIR = Path(__file__).parent.parent / "data" / "validation"
PHASE_11D_MANIFEST = VALIDATION_DIR / "phase_11d_manifest.json"
TRAIN_MANIFEST = VALIDATION_DIR / "phase_11e_train_manifest.json"
VAL_MANIFEST = VALIDATION_DIR / "phase_11e_val_manifest.json"

async def download_image(session, img_url, img_path, sem):
    if img_path.exists():
        return True
    async with sem:
        for attempt in range(3):
            try:
                async with session.get(img_url) as response:
                    if response.status == 200:
                        data = await response.read()
                        with open(img_path, 'wb') as f:
                            f.write(data)
                        return True
            except Exception:
                pass
            await asyncio.sleep(1)
        return False

async def process_and_save(df_sel, manifest_path, col_img, col_subset, col_sentinel_id):
    manifest = []
    VALIDATION_DIR.mkdir(parents=True, exist_ok=True)
    
    tasks = []
    sem = asyncio.Semaphore(15)
    
    async with aiohttp.ClientSession() as session:
        for _, row in df_sel.iterrows():
            img_filename_raw = row[col_img]
            img_basename = row['img_basename']
            is_oil = row[col_subset].startswith('o')
            scene_id = row[col_sentinel_id]
            
            img_url = IMAGE_BASE_URL + img_filename_raw
            img_path = VALIDATION_DIR / img_basename
            
            tasks.append(download_image(session, img_url, img_path, sem))
            
            manifest.append({
                "sample_id": img_basename,
                "source_dataset": "PANGAEA.980773 DARTIS_2019",
                "label": "OIL" if is_oil else "LOOK_ALIKE",
                "source_image": str(img_path.absolute()),
                "scene_id": scene_id
            })
            
        print(f"Starting {len(tasks)} concurrent downloads...")
        results = await asyncio.gather(*tasks)
        print(f"Downloaded {sum(results)} out of {len(tasks)} images.")
        
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
        
    return manifest

async def async_main():
    # Setup data
    print("Downloading PANGAEA DARTIS_2019 dataset table...")
    response = requests.get(DATASET_URL)
    response.raise_for_status()
    
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
    
    if not PHASE_11D_MANIFEST.exists():
        print("Phase 11D manifest missing!")
        return
        
    with open(PHASE_11D_MANIFEST, 'r') as f:
        manifest_11d = json.load(f)
        
    test_scenes = set([item["scene_id"] for item in manifest_11d])
    test_patches = set([item["sample_id"] for item in manifest_11d])
    
    df = df[~df[col_sentinel_id].isin(test_scenes)]
    df['img_basename'] = df[col_img].apply(lambda x: Path(x).name)
    df = df[~df['img_basename'].isin(test_patches)]
    
    unique_scenes = df[col_sentinel_id].unique()
    train_scenes, val_scenes = train_test_split(unique_scenes, test_size=0.2, random_state=42)
    
    train_scenes = set(train_scenes)
    val_scenes = set(val_scenes)
    
    df_train = df[df[col_sentinel_id].isin(train_scenes)]
    df_val = df[df[col_sentinel_id].isin(val_scenes)]
    
    def select_balanced_subset(df_split, target_oil, target_no_oil):
        oil_df = df_split[df_split[col_subset].str.startswith('o')]
        no_oil_df = df_split[df_split[col_subset].str.startswith('n')]
        
        oil_df = oil_df.sample(frac=1, random_state=42).head(target_oil)
        no_oil_df = no_oil_df.sample(frac=1, random_state=42).head(target_no_oil)
        
        return pd.concat([oil_df, no_oil_df]).sample(frac=1, random_state=42)
        
    df_train_selected = select_balanced_subset(df_train, 400, 400)
    df_val_selected = select_balanced_subset(df_val, 100, 100)
    
    print("Processing TRAIN set...")
    await process_and_save(df_train_selected, TRAIN_MANIFEST, col_img, col_subset, col_sentinel_id)
    print("Processing VAL set...")
    await process_and_save(df_val_selected, VAL_MANIFEST, col_img, col_subset, col_sentinel_id)
    print("Done!")

def main():
    asyncio.run(async_main())

if __name__ == "__main__":
    main()
