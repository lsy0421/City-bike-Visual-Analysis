"""Export the notebook's chart payloads as JSON for the static D3 site in docs/.

The site and the Milestone 3 notebook use the same transformations (milestone3/charts.py),
including the station-ID reconciliation, so both always show the same numbers.

    python docs/build_data.py        # needs shapely and IPython (see milestone3/requirements.txt)
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "milestone3"))

from shapely.geometry import mapping, shape          # noqa: E402
from shapely.geometry.polygon import orient          # noqa: E402

from charts import (DAYS, PERIODS, basemap, hourly_departures, membership_shares,  # noqa: E402
                    station_net_flow, window_hotspots)

OUT = ROOT / "docs" / "data"


def manhattan_outline():
    """Manhattan only, with clockwise exterior rings as d3's spherical projections expect."""
    feature = next(f for f in basemap()["features"] if f["properties"]["name"] == "Manhattan")
    geom = shape(feature["geometry"])
    polygons = getattr(geom, "geoms", [geom])
    fixed = [orient(p, sign=-1.0) for p in polygons]
    geometry = mapping(fixed[0] if len(fixed) == 1 else type(geom)(fixed))
    return {"type": "FeatureCollection",
            "features": [{"type": "Feature", "properties": {"name": "Manhattan"}, "geometry": geometry}]}


def write(name, payload):
    path = OUT / name
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{path.relative_to(ROOT)}: {path.stat().st_size:,} bytes")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    stations, _ = station_net_flow()
    write("q1.json", hourly_departures())
    write("q2.json", membership_shares())
    write("q3.json", {"stations": stations, "days": DAYS})
    write("q4.json", {"stations": window_hotspots(), "days": DAYS, "periods": PERIODS})
    write("manhattan.geojson", manhattan_outline())
    shutil.copy(ROOT / "manhattan-data" / "data" / "processed" / "audit.json", OUT / "audit.json")


if __name__ == "__main__":
    main()
