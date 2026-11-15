"""
Citi Bike, September 2026 — data processing for the four visualizations.

Usage:
    python process_citibike.py [csv1 csv2 ...]

With no arguments it processes every CSV in 202609-citibike-tripdata/ (the full month).
Pass one or more CSV paths to process only those parts.

Outputs (in ./processed/):
    cleaned_trips_sample.csv
    table1_hourly.csv               Q1  Weekday vs Weekend hourly departures
    table2_user_hourly.csv          Q2  Member vs Casual hourly share
    table3_station_netflow.csv      Q3  Station net inflow / outflow
    table4_window_hotspots.csv      Q4  Departure hotspots by time window
    tableN_..._sample.csv           representative samples of each table
    cleaning_log.csv
    processed_data_samples.md       all samples as Markdown tables (for the report)
    processed_data_samples.xlsx     all samples, one sheet per table
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "202609-citibike-tripdata"
OUT = ROOT / "processed"

START_DATE, END_DATE = "2026-09-01", "2026-09-30"
HOLIDAYS = {"2026-09-07"}            # Labor Day, excluded so "Weekday" = regular working day
MIN_DURATION, MAX_DURATION = 1, 180  # minutes

# Table 4 time windows (end hour exclusive)
WINDOWS = [
    ("Morning", "Morning (06:00-09:59)", 6, 10),
    ("Midday", "Midday (11:00-14:59)", 11, 15),
    ("Evening", "Evening (16:00-19:59)", 16, 20),
]
DAY_TYPES = ["Weekday", "Weekend"]
USER_TYPES = ["Member", "Casual"]

USECOLS = ["ride_id", "rideable_type", "started_at", "ended_at",
           "start_station_name", "start_station_id", "end_station_name", "end_station_id",
           "start_lat", "start_lng", "end_lat", "end_lng", "member_casual"]


# ---------------------------------------------------------------- Part 0: cleaning
def read_part(path, usecols=USECOLS):
    # station IDs stay strings so values like "6140.05" keep their format;
    # Arrow-backed strings keep a full month (~4.7M rows) within a few GB of RAM
    return pd.read_csv(path, usecols=usecols, dtype="string[pyarrow]",
                       keep_default_na=False, na_values=[""])


def load_and_clean(paths):
    """Clean each CSV part separately, then combine, so the raw month never sits in memory at once."""
    # pass 1: ride_ids only, to find duplicates across all parts (first occurrence is kept)
    ids = pd.concat([read_part(p, ["ride_id"])["ride_id"] for p in paths], ignore_index=True)
    is_dup = ids.duplicated().to_numpy()
    del ids

    log = {k: 0 for k in ["Raw rows loaded", "Removed: duplicate ride_id",
                          "Removed: start date outside Sept 2026", "Removed: Labor Day (Sept 7)",
                          "Removed: missing station/coordinates",
                          "Removed: duration < 1 or > 180 min", "Trips kept for analysis"]}
    parts, start = [], 0
    for p in paths:
        raw = read_part(p)
        dup = is_dup[start:start + len(raw)]
        start += len(raw)
        parts.append(clean_part(raw, dup, log))
        print(f"  {p.name}: {len(raw):,} raw -> {len(parts[-1]):,} kept", flush=True)
        del raw
    trips = pd.concat(parts, ignore_index=True)
    log["Trips kept for analysis"] = len(trips)
    return trips, log


def clean_part(raw, dup, log):
    log["Raw rows loaded"] += len(raw)

    df = raw[~dup]
    log["Removed: duplicate ride_id"] += len(raw) - len(df)

    df = df.assign(date=df["started_at"].str[:10])
    n = len(df)
    df = df[(df["date"] >= START_DATE) & (df["date"] <= END_DATE)]
    log["Removed: start date outside Sept 2026"] += n - len(df)

    n = len(df)
    df = df[~df["date"].isin(HOLIDAYS)]
    log["Removed: Labor Day (Sept 7)"] += n - len(df)

    # some rows drop the trailing zero of station IDs ("5980.1" vs "5980.10"); restore the 2-decimal form.
    # a few stations also appear with a trailing "_" ("6517.08_"), same name and place; merge them.
    for c in ["start_station_id", "end_station_id"]:
        s = df[c].str.strip().str.rstrip("_")
        df[c] = s.mask(s.str.fullmatch(r"\d+\.\d").fillna(False), s + "0")

    for c in ["start_lat", "start_lng", "end_lat", "end_lng"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    coords = df[["start_lat", "start_lng", "end_lat", "end_lng"]]
    valid = (df["start_station_id"].notna() & df["end_station_id"].notna()
             & coords.notna().all(axis=1) & (coords != 0).all(axis=1))
    n = len(df)
    df = df[valid]
    log["Removed: missing station/coordinates"] += n - len(df)

    start = pd.to_datetime(df["started_at"])
    end = pd.to_datetime(df["ended_at"])
    df = df.assign(duration_min=(end - start).dt.total_seconds() / 60, _start=start)
    n = len(df)
    df = df[df["duration_min"].between(MIN_DURATION, MAX_DURATION)]
    log["Removed: duration < 1 or > 180 min"] += n - len(df)

    trips = pd.DataFrame({
        "ride_id": df["ride_id"],
        "date": df["date"],
        "hour": df["_start"].dt.hour,          # timestamps are already NYC local time
        "day_type": np.where(df["_start"].dt.dayofweek >= 5, "Weekend", "Weekday"),
        "user_type": np.where(df["member_casual"].eq("member").fillna(False).to_numpy(bool), "Member", "Casual"),
        "rideable_type": df["rideable_type"],
        "start_station_id": df["start_station_id"],
        "start_station_name": df["start_station_name"],
        "start_lat": df["start_lat"], "start_lng": df["start_lng"],
        "end_station_id": df["end_station_id"],
        "end_station_name": df["end_station_name"],
        "end_lat": df["end_lat"], "end_lng": df["end_lng"],
        "duration_min": df["duration_min"].round(2),
    }).reset_index(drop=True)
    return trips


def count_days(trips):
    """Distinct dates per day type, used to turn totals into daily averages."""
    return trips.drop_duplicates("date")["day_type"].value_counts().reindex(DAY_TYPES, fill_value=0)


def build_station_lookup(trips):
    """Median of all observed coordinates; most frequent name."""
    starts = trips[["start_station_id", "start_station_name", "start_lat", "start_lng"]]
    ends = trips[["end_station_id", "end_station_name", "end_lat", "end_lng"]]
    cols = ["station_id", "station_name", "lat", "lng"]
    both = pd.concat([starts.set_axis(cols, axis=1), ends.set_axis(cols, axis=1)], ignore_index=True)
    coords = both.groupby("station_id")[["lat", "lng"]].median().round(6)
    names = (both.groupby(["station_id", "station_name"]).size()
             .reset_index(name="n").sort_values("n", ascending=False)
             .drop_duplicates("station_id").set_index("station_id")["station_name"])
    return coords.join(names)[["station_name", "lat", "lng"]]


# ---------------------------------------------------------------- Q1
def table1_hourly(trips, n_days):
    idx = pd.MultiIndex.from_product([DAY_TYPES, range(24)], names=["day_type", "hour"])
    t = trips.groupby(["day_type", "hour"]).size().reindex(idx, fill_value=0)
    t = t.rename("total_departures").reset_index()
    t["n_days"] = t["day_type"].map(n_days)
    t["avg_daily_departures"] = (t["total_departures"] / t["n_days"]).round(1)
    return t


# ---------------------------------------------------------------- Q2
def table2_user_hourly(trips):
    idx = pd.MultiIndex.from_product([DAY_TYPES, USER_TYPES, range(24)],
                                     names=["day_type", "user_type", "hour"])
    t = trips.groupby(["day_type", "user_type", "hour"]).size().reindex(idx, fill_value=0)
    t = t.rename("departures").reset_index()
    t["group_total"] = t.groupby(["day_type", "user_type"])["departures"].transform("sum")
    t["hour_share"] = (t["departures"] / t["group_total"].replace(0, np.nan)).fillna(0).round(4)
    return t


# ---------------------------------------------------------------- Q3
def table3_station_netflow(trips, n_days, stations):
    dep = trips.groupby(["day_type", "start_station_id"]).size().rename("departures")
    arr = trips.groupby(["day_type", "end_station_id"]).size().rename("arrivals")
    dep.index.names = arr.index.names = ["day_type", "station_id"]
    t = pd.concat([arr, dep], axis=1).fillna(0).reset_index()
    n = t["day_type"].map(n_days)
    t["avg_daily_arrivals"] = (t["arrivals"] / n).round(2)
    t["avg_daily_departures"] = (t["departures"] / n).round(2)
    t["avg_daily_net_inflow"] = ((t["arrivals"] - t["departures"]) / n).round(2)
    t["net_inflow_abs"] = t["avg_daily_net_inflow"].abs()
    t["flow_direction"] = np.select(
        [t["avg_daily_net_inflow"] > 0, t["avg_daily_net_inflow"] < 0],
        ["Net inflow", "Net outflow"], "Balanced")
    t = t.join(stations, on="station_id")
    cols = ["day_type", "station_id", "station_name", "lat", "lng",
            "avg_daily_arrivals", "avg_daily_departures", "avg_daily_net_inflow",
            "net_inflow_abs", "flow_direction"]
    return t[cols].sort_values(["day_type", "station_id"]).reset_index(drop=True)


# ---------------------------------------------------------------- Q4
def table4_window_hotspots(trips, n_days, stations):
    parts = []
    for key, label, h0, h1 in WINDOWS:
        sub = trips[(trips["hour"] >= h0) & (trips["hour"] < h1)]
        g = sub.groupby(["day_type", "start_station_id"]).size().rename("total_departures").reset_index()
        g.insert(1, "time_window", key)
        g.insert(2, "window_hours", label.split("(")[1].rstrip(")"))
        parts.append(g)
    t = pd.concat(parts, ignore_index=True).rename(columns={"start_station_id": "station_id"})
    t["n_days"] = t["day_type"].map(n_days)
    t["avg_daily_departures"] = (t["total_departures"] / t["n_days"]).round(2)
    t = t.join(stations, on="station_id")
    cols = ["day_type", "time_window", "window_hours", "station_id", "station_name", "lat", "lng",
            "total_departures", "n_days", "avg_daily_departures"]
    order = {k: i for i, (k, *_) in enumerate(WINDOWS)}
    return (t[cols].sort_values(["day_type", "time_window", "avg_daily_departures"],
                                key=lambda s: s.map(order) if s.name == "time_window" else s,
                                ascending=[True, True, False])
            .reset_index(drop=True))


# ---------------------------------------------------------------- samples
def samples(trips, t1, t2, t3, t4):
    s0 = trips.head(10)
    s1 = t1[t1["hour"].isin([0, 5, 8, 12, 17, 22])]
    s2 = t2[t2["hour"].isin([8, 14, 17])]
    s3 = pd.concat(
        [pd.concat([g.nlargest(3, "avg_daily_net_inflow"), g.nsmallest(3, "avg_daily_net_inflow")])
         for _, g in t3.groupby("day_type")], ignore_index=True)
    s4 = t4.groupby(["day_type", "time_window"], sort=False).head(2).reset_index(drop=True)
    return {
        "cleaned_trips_sample": s0,
        "table1_hourly_sample": s1,
        "table2_user_hourly_sample": s2,
        "table3_station_netflow_sample": s3,
        "table4_window_hotspots_sample": s4,
    }


def to_markdown(df):
    cols = list(df.columns)
    lines = ["| " + " | ".join(cols) + " |", "| " + " | ".join("---" for _ in cols) + " |"]
    lines += ["| " + " | ".join(str(v) for v in row) + " |" for row in df.itertuples(index=False)]
    return "\n".join(lines)


def main():
    paths = [Path(p) for p in sys.argv[1:]] or sorted(DATA_DIR.glob("*.csv"))
    OUT.mkdir(exist_ok=True)

    trips, log = load_and_clean(paths)
    n_days = count_days(trips)
    stations = build_station_lookup(trips)

    t1 = table1_hourly(trips, n_days)
    t2 = table2_user_hourly(trips)
    t3 = table3_station_netflow(trips, n_days, stations)
    t4 = table4_window_hotspots(trips, n_days, stations)

    full = {"table1_hourly": t1, "table2_user_hourly": t2,
            "table3_station_netflow": t3, "table4_window_hotspots": t4}
    for name, df in full.items():
        df.to_csv(OUT / f"{name}.csv", index=False, encoding="utf-8")
    log_df = pd.DataFrame(list(log.items()), columns=["step", "rows"])
    log_df.to_csv(OUT / "cleaning_log.csv", index=False, encoding="utf-8")
    trips.head(200).to_csv(OUT / "cleaned_trips_first200.csv", index=False, encoding="utf-8")

    samp = samples(trips, t1, t2, t3, t4)
    for name, df in samp.items():
        df.to_csv(OUT / f"{name}.csv", index=False, encoding="utf-8")

    with pd.ExcelWriter(OUT / "processed_data_samples.xlsx") as xw:
        log_df.to_excel(xw, sheet_name="cleaning_log", index=False)
        for name, df in samp.items():
            df.to_excel(xw, sheet_name=name[:31], index=False)

    titles = {
        "cleaned_trips_sample": "Cleaned trips (first 10 rows)",
        "table1_hourly_sample": "Table 1 - Hourly departures, Weekday vs Weekend (selected hours)",
        "table2_user_hourly_sample": "Table 2 - Member vs Casual hourly share (08, 14, 17 h)",
        "table3_station_netflow_sample": "Table 3 - Station net flow (top 3 inflow / outflow per day type)",
        "table4_window_hotspots_sample": "Table 4 - Departure hotspots by time window (top 2 per panel)",
    }
    md = ["# Processed Data Samples - Citi Bike, September 2026", "",
          "Input: " + ", ".join(p.name for p in paths), "",
          f"Days used: Weekday = {n_days['Weekday']}, Weekend = {n_days['Weekend']}", "",
          "## Cleaning log", "", to_markdown(log_df), ""]
    for name, df in samp.items():
        md += [f"## {titles[name]}", "",
               f"Full table: {len(full.get(name.replace('_sample', ''), trips)):,} rows", "",
               to_markdown(df), ""]
    (OUT / "processed_data_samples.md").write_text("\n".join(md), encoding="utf-8")

    print(log_df.to_string(index=False))
    print("n_days:", n_days.to_dict())
    for name, df in full.items():
        print(f"{name}: {len(df):,} rows")
    print("Wrote outputs to", OUT)


if __name__ == "__main__":
    main()
