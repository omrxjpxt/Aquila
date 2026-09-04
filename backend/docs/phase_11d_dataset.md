# Phase 11D Dataset Investigation

## Benchmark Metadata
- **Dataset Name**: Oil slicks, look-alikes and other remarkable SAR signatures in Sentinel-1 imagery in the Eastern Mediterranean Sea in 2019
- **DOI / Source**: [10.1594/PANGAEA.980773](https://doi.org/10.1594/PANGAEA.980773)
- **Publication**: Earth System Science Data, 2025 (Yang, Y.-J., Singha, S., Goldman, R., and Schütte, F.)
- **Sentinel-1 Acquisition Period**: 2019-01-01 to 2019-12-31
- **Geographic Coverage**: Eastern Mediterranean Sea (Longitudes 27.12°E to 36.09°E, Latitudes 29.30°N to 36.37°N)

## Data Format and Limitations
- **Image Format**: JPEG (`.jpg`) patches with XML bounding boxes.
- **Representation Shift**: The dataset provides 8-bit scaled imagery (JPEGs) rather than the raw 32-bit floating-point linear $\sigma^0$ or dB GeoTIFFs that AQUILA natively processes from the CDSE API. This poses a massive representation mismatch for evaluating the current HOG+SVM, which expects calibrated dB values.
- **Polarization**: Derived from Sentinel-1, presumed primarily VV.
- **Preprocessing Level**: Image patches have been converted to 8-bit pixel intensities for visual inspection. The exact radiometric calibration applied prior to JPEG generation is not documented in the raw manifest, meaning we cannot precisely invert it to $\sigma^0$ dB.

## Label Semantics
- **Oil-Label Definition**: Expert/interpreter annotations created visually for a prior study (Yang et al., 2024). These do **NOT** represent independently confirmed petroleum ground truth (e.g., via aircraft or vessel sampling).
- **Look-Alike-Label Definition**: Oceanographic, atmospheric, and acquisition phenomena that manifest as dark signatures in SAR imagery and visually mimic oil spills.
- **Label Types**: Image-level categorization (oil vs. no-oil) stratified by location (coast vs. open water), plus bounding boxes for specific objects.
- **Original Scene IDs**: Yes, full Sentinel-1 `.SAFE` IDs are provided in the data matrix, enabling CDSE cross-checks.
- **Georeferencing**: Patch corner coordinates (Lat/Lon) are provided in the tabular data.

## Appropriateness
- **Classification**: Yes (Image-level).
- **Detection**: Yes (Bounding box hit rate).
- **Segmentation**: No (Masks are not provided).
- **Operational Reality Check**: The representation mismatch (JPG vs Float32) means direct evaluation of AQUILA's SVM on the downloaded JPEG patches will test the model's resilience to severe quantization and scaling, rather than its raw operational performance on CDSE data. True operational validation requires retrieving the original scenes from CDSE.
