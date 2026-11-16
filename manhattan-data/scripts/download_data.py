"""Download the exact public inputs used by this analysis."""
from pathlib import Path
from urllib.request import urlopen
from shutil import copyfileobj
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'data/raw'
DEST.mkdir(parents=True,exist_ok=True)
SOURCES={
 '202609-citibike-tripdata.zip':'https://s3.amazonaws.com/tripdata/202609-citibike-tripdata.zip',
 'boroughs.geojson':'https://data.cityofnewyork.us/resource/gthc-hcne.geojson?$limit=10',
}
for filename,url in SOURCES.items():
    target=DEST/filename
    if target.exists():
        print('Already present:',target);continue
    temporary=target.with_suffix(target.suffix+'.part')
    print('Downloading:',url,flush=True)
    with urlopen(url,timeout=120) as response, temporary.open('wb') as output:
        copyfileobj(response,output,length=1024*1024)
    temporary.replace(target)
    print('Saved:',target)
