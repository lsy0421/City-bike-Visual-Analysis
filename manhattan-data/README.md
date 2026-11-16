# September 2026 Manhattan Citi Bike Data

Use these tables for the four Milestone 3 views. They cover rides departing in September 2026 with both endpoints in the official Manhattan borough, using the same scope as the Milestone 2 sketches. The borough includes its official outlying areas and islands.

| View | Full table | Sample | What each row represents |
| --- | --- | --- | --- |
| Q1 Hourly departures | [CSV](data/processed/q1_hourly.csv) | [CSV](data/processed/q1_hourly_sample.csv) | Day type and departure hour, with trip count, number of days, and trips per day |
| Q2 Rider timing | [CSV](data/processed/q2_membership.csv) | [CSV](data/processed/q2_membership_sample.csv) | Day type, rider category, and departure hour, with trip count, group total, and share from 0 to 1 |
| Q3 Station net flow | [CSV](data/processed/q3_station_netflow.csv) | [CSV](data/processed/q3_station_netflow_sample.csv) | Day type and station, with arrivals, departures, and net inflow per day |
| Q4 Departure hotspots | [CSV](data/processed/q4_hotspots.csv) | [CSV](data/processed/q4_hotspots_sample.csv) | Day type, departure window, and station, with departures per day |

Use [station metadata](data/processed/stations.csv) or the coordinates included in Q3 and Q4. Treat station IDs as strings. The [station hourly departures](data/processed/station_hourly_departures.csv) table supports station details. The [daily coverage table](data/processed/daily_coverage.csv) includes Labor Day for audit purposes.

## Scope and calculations

- The pipeline reads all five CSVs from the NYC monthly archive and uses NYC local timestamps. It keeps September departures with unique ride IDs, positive durations, and valid station IDs and coordinates at both ends.
- Both longitude/latitude points must intersect the official land boundary of Manhattan. Exact boundary points qualify.
- Departures are divided by 21 ordinary weekdays or 8 weekend days. Labor Day, September 7, is excluded from those comparisons. The denominators include days with zero trips for a particular hour, station, or window.
- Q2 divides the hourly count by `group_total`, the number of trips for the matching day type and member or casual category across all hours.
- Q3 classifies departures by start time and arrivals by end time. Only arrival events in September and outside Labor Day count. Net inflow is mean arrivals minus mean departures for the same day type. The analysis uses September departures, so August departures that arrived in September are outside its coverage. The metric describes trip events and cannot account for the station's actual bike inventory.
- Q4 uses equal three-hour windows beginning at 07:00, 11:00, and 16:00 local time. It includes each start time and excludes each end time. The table retains zero-count station combinations.

## Data sources and reproduction

- [Citi Bike System Data](https://citibikenyc.com/system-data) provides the [September 2026 NYC ZIP](https://s3.amazonaws.com/tripdata/202609-citibike-tripdata.zip). The downloader saves it under `data/raw/`. It is about 972 MB.
- [NYC Department of City Planning Borough Boundaries](https://data.cityofnewyork.us/City-Government/Borough-Boundaries/gthc-hcne) provides the [boundary GeoJSON](https://data.cityofnewyork.us/resource/gthc-hcne.geojson?$limit=10). The exact snapshot used here is checked in as [boroughs.geojson](data/raw/boroughs.geojson).

From the repository root, run with Python 3.12:

```sh
cd manhattan-data
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/download_data.py
python scripts/build.py --data-only
```

The tables are regenerated under `data/processed/`. The [audit](data/processed/audit.json) records inputs and exclusions. The [validation results](data/processed/validation.json) record checks on dates, counts, percentages, and net flow.

## AI use

Codex assisted with implementing and validating the data processing and documenting the team's agreed analysis.
