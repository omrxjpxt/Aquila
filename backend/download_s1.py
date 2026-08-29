from pystac_client import Client
import planetary_computer as pc
import rasterio
from rasterio.windows import Window
import os

def download():
    catalog = Client.open(
        "https://planetarycomputer.microsoft.com/api/stac/v1",
        modifier=pc.sign_inplace
    )
    
    search = catalog.search(
        collections=["sentinel-1-rtc"],
        bbox=[58.0, 24.0, 58.5, 24.5],
        limit=1
    )
    
    items = list(search.items())
    if not items:
        print("No features found")
        return
        
    item = items[0]
    print(f"Found item: {item.id}")
    
    if "vv" not in item.assets:
        print("No VV polarization found in assets.")
        return
        
    vv_asset = item.assets["vv"].href
    print(f"Downloading cropped window from {vv_asset}...")
    
    os.makedirs("data/sample", exist_ok=True)
    out_path = "data/sample/real_s1_cropped.tif"
    
    with rasterio.open(vv_asset) as src:
        w, h = src.width, src.height
        window = Window(w//2 - 512, h//2 - 512, 1024, 1024)
        data = src.read(1, window=window)
        kwargs = src.meta.copy()
        kwargs.update({
            'height': 1024,
            'width': 1024,
            'transform': rasterio.windows.transform(window, src.transform)
        })
        with rasterio.open(out_path, "w", **kwargs) as dst:
            dst.write(data, 1)
            dst.update_tags(
                POLARIZATION="VV", 
                PRODUCT_TYPE="RTC", 
                MISSION="SENTINEL-1",
                ORIGINAL_SCENE_ID=item.id,
                ACQUISITION_DATETIME=str(item.datetime)
            )
            
    print(f"Downloaded real S1 crop to {out_path}.")
    print("Original Scene ID:", item.id)
    print("Date:", item.datetime)

if __name__ == "__main__":
    download()
