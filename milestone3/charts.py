"""Load the project aggregates and embed the D3 charts in a Jupyter output."""

import csv
import html
import json
import math
import re
from collections import defaultdict
from pathlib import Path

from IPython.display import HTML

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "manhattan-data" / "data"
DAYS = {"weekday": 21, "weekend": 8}


def read_table(name):
    with (DATA / "processed" / name).open(encoding="utf-8", newline="") as source:
        return list(csv.DictReader(source))


def hourly_departures():
    return [
        {
            "day": row["day_type"],
            "hour": int(row["hour"]),
            "count": int(row["trip_count"]),
            "days": int(row["denominator_days"]),
        }
        for row in read_table("q1_hourly.csv")
    ]


def station_aliases(stations):
    """Match one-digit station IDs to confirmed two-digit versions."""
    aliases = {}
    for station_id, short in stations.items():
        full_id = station_id + "0"
        if not re.fullmatch(r"\d+\.\d", station_id) or full_id not in stations:
            continue
        full = stations[full_id]
        north = float(full["lat"])
        lat_distance = north - float(short["lat"])
        lon_distance = (float(full["lon"]) - float(short["lon"])) * math.cos(math.radians(north))
        distance_metres = 111_195 * math.hypot(lat_distance, lon_distance)
        if full["station_name"] == short["station_name"] and distance_metres <= 2:
            aliases[station_id] = full_id
    return aliases


def station_net_flow():
    stations = {row["station_id"]: row for row in read_table("stations.csv")}
    aliases = station_aliases(stations)
    counts = defaultdict(lambda: {"arrivals": 0, "departures": 0})
    for row in read_table("q3_station_netflow.csv"):
        station_id = aliases.get(row["station_id"], row["station_id"])
        bucket = counts[station_id, row["day_type"]]
        bucket["arrivals"] += int(row["arrival_count"])
        bucket["departures"] += int(row["departure_count"])

    result = []
    for station_id in sorted(stations.keys() - aliases.keys()):
        row = stations[station_id]
        result.append(
            {
                "id": station_id,
                "name": row["station_name"],
                "coordinate": [float(row["lon"]), float(row["lat"])],
                "days": {day: counts[station_id, day] for day in DAYS},
            }
        )
    return result, aliases


def basemap():
    """Clip and simplify the official boundaries for display only."""
    from shapely.geometry import box, mapping, shape

    source = json.loads((DATA / "raw" / "boroughs.geojson").read_text(encoding="utf-8"))
    region = box(-74.045, 40.672, -73.892, 40.890)
    features = []
    for feature in source["features"]:
        clipped = shape(feature["geometry"]).intersection(region).simplify(0.00014)
        if not clipped.is_empty:
            features.append(
                {
                    "type": "Feature",
                    "properties": {"name": feature["properties"]["boroname"]},
                    "geometry": mapping(clipped),
                }
            )
    return {"type": "FeatureCollection", "features": features}


def chart_document(name, payload):
    """Create a self-contained browser document without external requests."""
    scripts = [
        json.dumps(payload, ensure_ascii=True).replace("<", "\\u003c"),
        (HERE / "vendor" / "d3.min.js").read_text(encoding="utf-8"),
        (HERE / f"{name}.js").read_text(encoding="utf-8"),
    ]
    style = (HERE / "charts.css").read_text(encoding="utf-8")
    markup = (HERE / f"{name}.html").read_text(encoding="utf-8")
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f"<style>{style}</style><body>{markup}"
        f'<script id="chart-data" type="application/json">{scripts[0]}</script>'
        f"<script>{scripts[1]}</script><script>{scripts[2]}</script></body></html>"
    )


def embed(name, payload, title, height):
    document = html.escape(chart_document(name, payload), quote=True)
    return HTML(
        f'<iframe title="{html.escape(title, quote=True)}" sandbox="allow-scripts" '
        f'style="display:block;width:100%;height:{height}px;border:0" srcdoc="{document}"></iframe>'
    )
