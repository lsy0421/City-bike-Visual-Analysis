# Data Processing — Citi Bike, September 2026

> **Scope.** All tables below are derived from Citi Bike trip history data for **September 2026**, downloaded from the official Citi Bike System Data website (https://citibikenyc.com/system-data). Only trips that **started between September 1 and September 30, 2026** are included.
>
> **Code.** Every code block below is one **Observable notebook cell**. Paste them in order. Replace each `<文件名>` with the name of your attached file. The monthly data is often split into several CSVs, so add one `FileAttachment(...)` line per file.

---

## Part 0 — Shared Cleaning and Derived Fields

All four tables are built from one cleaned trip table, so every view uses the same filtering rules.

**Transformations**

1. **Load raw CSVs as strings** (untyped), so station IDs such as `6140.05` keep their original format.
2. **Deduplicate** on `ride_id`.
3. **Date filter:** keep trips whose `started_at` falls in 2026-09-01 – 2026-09-30.
4. **Holiday handling:** **Labor Day (Mon, Sept 7, 2026)** is removed, so "Weekday" means a *regular* working day.
5. **Missing data:** drop trips with a missing start or end station ID, or invalid coordinates.
6. **Duration filter:** `trip_duration = ended_at − started_at`. Keep trips between 1 and 180 minutes.
7. **Derived fields:**
   - `date`: the start date
   - `hour`: departure hour, 0–23, read directly from the local-time timestamp
   - `day_type`: Saturday/Sunday → `Weekend`, otherwise `Weekday`
   - `user_type`: `Member` / `Casual`
8. **Day counts for normalization:** count the number of distinct dates of each `day_type` that appear in the cleaned data. With the rules above, September 2026 has **21 regular weekdays** and **8 weekend days**. All "average daily" values are divided by these counts.
9. **Station lookup:** for each station ID, the coordinates are the **median** of all observed trip coordinates (start and end), and the name is the **most frequent** name.

```js
// Cell: configuration
HOLIDAYS = new Set(["2026-09-07"]) // Labor Day, excluded from analysis
```

```js
// Cell: time windows for Table 4 (end hour is exclusive)
WINDOWS = [
  {key: "Morning", label: "Morning (06:00–09:59)", start: 6,  end: 10},
  {key: "Midday",  label: "Midday (11:00–14:59)",  start: 11, end: 15},
  {key: "Evening", label: "Evening (16:00–19:59)", start: 16, end: 20}
]
```

```js
// Cell: rounding helper
function round(x, k = 2) {
  const p = 10 ** k;
  return Math.round(x * p) / p;
}
```

```js
// Cell: load + clean all trips
cleaned = {
  const files = [
    FileAttachment("<文件名>"),
    // FileAttachment("<文件名>"),   // add one line per monthly CSV part
  ];

  const log = {raw: 0, duplicate: 0, outOfRange: 0, holiday: 0, missing: 0, badDuration: 0, kept: 0};
  const seen = new Set();
  const rows = [];

  for (const f of files) {
    const raw = await f.csv(); // untyped: everything stays a string
    log.raw += raw.length;

    for (const r of raw) {
      if (seen.has(r.ride_id)) { log.duplicate++; continue; }
      seen.add(r.ride_id);

      const date = r.started_at?.slice(0, 10);
      if (!date || date < "2026-09-01" || date > "2026-09-30") { log.outOfRange++; continue; }
      if (HOLIDAYS.has(date)) { log.holiday++; continue; }

      const sLat = +r.start_lat, sLng = +r.start_lng, eLat = +r.end_lat, eLng = +r.end_lng;
      if (!r.start_station_id || !r.end_station_id ||
          ![sLat, sLng, eLat, eLng].every(v => Number.isFinite(v) && v !== 0)) {
        log.missing++; continue;
      }

      const start = new Date(r.started_at.replace(" ", "T"));
      const end = new Date(r.ended_at.replace(" ", "T"));
      const duration = (end - start) / 60000;
      if (!(duration >= 1 && duration <= 180)) { log.badDuration++; continue; }

      const dow = new Date(date + "T00:00:00Z").getUTCDay(); // 0 = Sun, 6 = Sat
      rows.push({
        date,
        hour: +r.started_at.slice(11, 13),
        day_type: dow === 0 || dow === 6 ? "Weekend" : "Weekday",
        user_type: r.member_casual === "member" ? "Member" : "Casual",
        start_id: r.start_station_id, start_name: r.start_station_name, start_lat: sLat, start_lng: sLng,
        end_id: r.end_station_id, end_name: r.end_station_name, end_lat: eLat, end_lng: eLng,
        duration_min: duration
      });
    }
  }
  log.kept = rows.length;
  return {rows, log};
}
```

```js
// Cell: cleaned trips
trips = cleaned.rows
```

```js
// Cell: print — first 200 rows of the cleaned trip table
html`<p><b>Cleaned trips — first 200 of ${trips.length.toLocaleString()} rows</b></p>
${Inputs.table(trips.slice(0, 200), {
  rows: 25,
  format: {duration_min: d => d.toFixed(1)}
})}`
```

```js
// Cell: cleaning summary (use these numbers in the report)
Inputs.table([
  {step: "Raw rows loaded",                       rows: cleaned.log.raw},
  {step: "Removed: duplicate ride_id",            rows: cleaned.log.duplicate},
  {step: "Removed: start date outside Sept 2026", rows: cleaned.log.outOfRange},
  {step: "Removed: Labor Day (Sept 7)",           rows: cleaned.log.holiday},
  {step: "Removed: missing station/coordinates",  rows: cleaned.log.missing},
  {step: "Removed: duration < 1 or > 180 min",    rows: cleaned.log.badDuration},
  {step: "Trips kept for analysis",               rows: cleaned.log.kept}
])
```

```js
// Cell: number of distinct days per day type
nDays = {
  const dates = new Map();
  for (const t of trips) dates.set(t.date, t.day_type);
  const counts = {Weekday: 0, Weekend: 0};
  for (const type of dates.values()) counts[type]++;
  return counts; // expected: {Weekday: 21, Weekend: 8}
}
```

```js
// Cell: station lookup (median coordinates, most frequent name)
stations = {
  const acc = new Map();
  const add = (id, name, lat, lng) => {
    let s = acc.get(id);
    if (!s) acc.set(id, s = {lats: [], lngs: [], names: new Map()});
    if (s.lats.length < 500) { s.lats.push(lat); s.lngs.push(lng); } // cap sample per station
    s.names.set(name, (s.names.get(name) ?? 0) + 1);
  };
  for (const t of trips) {
    add(t.start_id, t.start_name, t.start_lat, t.start_lng);
    add(t.end_id, t.end_name, t.end_lat, t.end_lng);
  }
  return new Map([...acc].map(([id, s]) => [id, {
    station_id: id,
    station_name: d3.greatest(s.names, ([, c]) => c)[0],
    lat: round(d3.median(s.lats), 6),
    lng: round(d3.median(s.lngs), 6)
  }]));
}
```

```js
// Cell: helper — turn sample rows into a Markdown table you can paste into the report
function toMarkdown(rows) {
  const cols = Object.keys(rows[0]);
  const head = `| ${cols.join(" | ")} |\n| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows.map(r => `| ${cols.map(c => r[c]).join(" | ")} |`).join("\n");
  return `${head}\n${body}`;
}
```

```js
// Cell: helper — CSV download button
function downloadCSV(rows, name) {
  return DOM.download(new Blob([d3.csvFormat(rows)], {type: "text/csv"}), name, `Download ${name}`);
}
```

---

## Part 1 — Hourly Departures: Weekday vs. Weekend

**Visualization:** dual line chart. x = departure hour (0–23), y = average daily departures, color/line style = day type.

**Transformations**
- Group cleaned trips by `day_type` × `hour` and count departures.
- Divide each count by the number of days of that type (`n_days`). Weekday counts are divided by 21 and weekend counts by 8, so the two lines are directly comparable.
- Hours with no trips are filled with 0, so each day type has all 24 hours.
- Output: **48 rows** (2 day types × 24 hours).

| Column | Type | Description |
|---|---|---|
| `day_type` | string | `Weekday` or `Weekend` |
| `hour` | integer | Departure hour, 0–23 (local time) |
| `total_departures` | integer | Total trips starting in this hour, summed over all days of this type |
| `n_days` | integer | Number of days of this type in the cleaned data |
| `avg_daily_departures` | number | `total_departures / n_days` |

```js
// Cell: Table 1
table1_hourly = {
  const counts = d3.rollup(trips, v => v.length, d => d.day_type, d => d.hour);
  const rows = [];
  for (const day_type of ["Weekday", "Weekend"]) {
    for (let hour = 0; hour < 24; hour++) {
      const total = counts.get(day_type)?.get(hour) ?? 0;
      rows.push({
        day_type,
        hour,
        total_departures: total,
        n_days: nDays[day_type],
        avg_daily_departures: round(total / nDays[day_type], 1)
      });
    }
  }
  return rows;
}
```

```js
// Cell: print — first 200 rows of Table 1 (all 48 rows, since the table is smaller than 200)
html`<p><b>Table 1 — first 200 of ${table1_hourly.length} rows</b></p>
${Inputs.table(table1_hourly.slice(0, 200), {rows: 25})}`
```

```js
// Cell: representative sample — commute peaks vs. midday, both day types
table1_sample = table1_hourly.filter(d => [3, 8, 13, 17, 21].includes(d.hour))
```

```js
Inputs.table(table1_sample)
```

```js
Inputs.textarea({value: toMarkdown(table1_sample), rows: 14, width: 900}) // copy into report
```

```js
downloadCSV(table1_hourly, "table1_hourly.csv")
```

**Sample of processed data:** *(paste the Markdown output of the textarea cell here)*

---

## Part 2 — Hourly Distribution by User Type

**Visualization:** two side-by-side panels (Member, Casual). Each panel has a weekday line and a weekend line. x = hour, y = share of the group's departures. Both panels share the same y-axis scale.

**Transformations**
- Group cleaned trips by `day_type` × `user_type` × `hour` and count departures.
- For each `day_type` × `user_type` group, compute the group total.
- `hour_share = departures / group_total`. Within each group, the 24 shares add up to 100%. This makes groups of very different sizes comparable: it shows *when* each group rides, not *how many*.
- Missing hours are filled with 0.
- Output: **96 rows** (2 day types × 2 user types × 24 hours).

| Column | Type | Description |
|---|---|---|
| `day_type` | string | `Weekday` or `Weekend` |
| `user_type` | string | `Member` or `Casual` |
| `hour` | integer | Departure hour, 0–23 |
| `departures` | integer | Trips in this group and hour |
| `group_total` | integer | Total trips in this `day_type` × `user_type` group |
| `hour_share` | number | `departures / group_total` (0–1); sums to 1 within each group |

```js
// Cell: Table 2
table2_user_hourly = {
  const counts = d3.rollup(trips, v => v.length, d => d.day_type, d => d.user_type, d => d.hour);
  const rows = [];
  for (const day_type of ["Weekday", "Weekend"]) {
    for (const user_type of ["Member", "Casual"]) {
      const byHour = counts.get(day_type)?.get(user_type) ?? new Map();
      const group_total = d3.sum(byHour.values());
      for (let hour = 0; hour < 24; hour++) {
        const departures = byHour.get(hour) ?? 0;
        rows.push({
          day_type,
          user_type,
          hour,
          departures,
          group_total,
          hour_share: group_total ? round(departures / group_total, 4) : 0
        });
      }
    }
  }
  return rows;
}
```

```js
// Cell: print — first 200 rows of Table 2 (all 96 rows, since the table is smaller than 200)
html`<p><b>Table 2 — first 200 of ${table2_user_hourly.length} rows</b></p>
${Inputs.table(table2_user_hourly.slice(0, 200), {
  rows: 25,
  format: {hour_share: d => (d * 100).toFixed(2) + "%"}
})}`
```

```js
// Cell: check — every group's shares should sum to ~1
d3.rollups(table2_user_hourly, v => round(d3.sum(v, d => d.hour_share), 3), d => d.day_type, d => d.user_type)
```

```js
// Cell: representative sample — 8 am and 2 pm for all four groups
table2_sample = table2_user_hourly.filter(d => [8, 14].includes(d.hour))
```

```js
Inputs.table(table2_sample)
```

```js
Inputs.textarea({value: toMarkdown(table2_sample), rows: 12, width: 900})
```

```js
downloadCSV(table2_user_hourly, "table2_user_hourly.csv")
```

**Sample of processed data:** *(paste here)*

---

## Part 3 — Station Net Inflow / Outflow

**Visualization:** two side-by-side maps (Weekday, Weekend), plus a detail panel for the selected station. Position = station coordinates. Circle area = |net inflow|. Color and sign = net inflow vs. net outflow.

**Transformations**
- Count **departures** per `start_id` and **arrivals** per `end_id`, separately for each `day_type`.
- Combine them on station ID. A station with no departures or no arrivals gets 0 for that count.
- Divide by `n_days` to get daily averages.
- `avg_daily_net_inflow = avg_daily_arrivals − avg_daily_departures`. Positive values mean bikes pile up at the station; negative values mean the station drains.
- `net_inflow_abs` is provided for circle sizing, and `flow_direction` for color.
- Attach the station name and median coordinates from the station lookup.
- **Caveat:** net inflow describes trip flow only. It is **not** actual bike inventory, because operator rebalancing trips are excluded from the public data.
- Output: one row per station × day type (roughly 2 × number of active stations).

| Column | Type | Description |
|---|---|---|
| `day_type` | string | `Weekday` or `Weekend` |
| `station_id` | string | Citi Bike station ID |
| `station_name` | string | Most frequent station name |
| `lat`, `lng` | number | Median station coordinates |
| `avg_daily_arrivals` | number | Trips ending here per day |
| `avg_daily_departures` | number | Trips starting here per day |
| `avg_daily_net_inflow` | number | Arrivals − departures, per day |
| `net_inflow_abs` | number | Absolute value of net inflow (for circle area) |
| `flow_direction` | string | `Net inflow`, `Net outflow`, or `Balanced` |

```js
// Cell: Table 3
table3_station_netflow = {
  const dep = d3.rollup(trips, v => v.length, d => d.day_type, d => d.start_id);
  const arr = d3.rollup(trips, v => v.length, d => d.day_type, d => d.end_id);
  const rows = [];
  for (const day_type of ["Weekday", "Weekend"]) {
    const n = nDays[day_type];
    const depMap = dep.get(day_type) ?? new Map();
    const arrMap = arr.get(day_type) ?? new Map();
    const ids = new Set([...depMap.keys(), ...arrMap.keys()]);
    for (const id of ids) {
      const s = stations.get(id);
      const a = (arrMap.get(id) ?? 0) / n;
      const d = (depMap.get(id) ?? 0) / n;
      const net = round(a - d, 2);
      rows.push({
        day_type,
        station_id: id,
        station_name: s.station_name,
        lat: s.lat,
        lng: s.lng,
        avg_daily_arrivals: round(a, 2),
        avg_daily_departures: round(d, 2),
        avg_daily_net_inflow: net,
        net_inflow_abs: Math.abs(net),
        flow_direction: net > 0 ? "Net inflow" : net < 0 ? "Net outflow" : "Balanced"
      });
    }
  }
  return rows;
}
```

```js
// Cell: print — first 200 rows of Table 3
html`<p><b>Table 3 — first 200 of ${table3_station_netflow.length.toLocaleString()} rows</b></p>
${Inputs.table(table3_station_netflow.slice(0, 200), {rows: 25})}`
```

```js
// Cell: representative sample — strongest inflow and outflow stations for each day type
table3_sample = ["Weekday", "Weekend"].flatMap(type => {
  const sub = table3_station_netflow.filter(d => d.day_type === type);
  return [
    ...d3.sort(sub, d => -d.avg_daily_net_inflow).slice(0, 3), // top net inflow
    ...d3.sort(sub, d =>  d.avg_daily_net_inflow).slice(0, 3)  // top net outflow
  ];
})
```

```js
Inputs.table(table3_sample)
```

```js
Inputs.textarea({value: toMarkdown(table3_sample), rows: 16, width: 1100})
```

```js
downloadCSV(table3_station_netflow, "table3_station_netflow.csv")
```

**Sample of processed data:** *(paste here)*

---

## Part 4 — Departure Hotspots by Time Window

**Visualization:** six small maps. Rows = day type (Weekday, Weekend); columns = time window (Morning, Midday, Evening). Position = station coordinates. Circle area = average daily departures in that window. All six maps share the same map extent and the same size legend.

**Transformations**
- Assign each trip to a time window based on its departure hour:
  - **Morning:** 06:00–09:59
  - **Midday:** 11:00–14:59
  - **Evening:** 16:00–19:59

  Trips outside these windows are not used in this table. All windows are 4 hours long, so they can be compared fairly.
- Count departures per `day_type` × `time_window` × `start_id`.
- Divide by `n_days` to get the average daily departures in that window.
- Attach the station name and coordinates.
- Unlike Part 3, this table measures **departure demand only**. It shows where demand is located, not where bikes accumulate.
- Output: one row per station × day type × window where the station had at least one departure.

| Column | Type | Description |
|---|---|---|
| `day_type` | string | `Weekday` or `Weekend` |
| `time_window` | string | `Morning`, `Midday`, or `Evening` |
| `window_hours` | string | Hour range of the window |
| `station_id` | string | Citi Bike station ID |
| `station_name` | string | Most frequent station name |
| `lat`, `lng` | number | Median station coordinates |
| `avg_daily_departures` | number | Departures in this window per day of this type |

```js
// Cell: Table 4
table4_window_hotspots = {
  const winOf = h => WINDOWS.find(w => h >= w.start && h < w.end);
  const counts = new Map(); // key: day_type|window|station_id
  for (const t of trips) {
    const w = winOf(t.hour);
    if (!w) continue;
    const k = `${t.day_type}|${w.key}|${t.start_id}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const rows = [];
  for (const [k, c] of counts) {
    const [day_type, time_window, id] = k.split("|");
    const w = WINDOWS.find(w => w.key === time_window);
    const s = stations.get(id);
    rows.push({
      day_type,
      time_window,
      window_hours: `${String(w.start).padStart(2, "0")}:00–${String(w.end - 1).padStart(2, "0")}:59`,
      station_id: id,
      station_name: s.station_name,
      lat: s.lat,
      lng: s.lng,
      avg_daily_departures: round(c / nDays[day_type], 2)
    });
  }
  return d3.sort(rows, d => d.day_type, d => WINDOWS.findIndex(w => w.key === d.time_window), d => -d.avg_daily_departures);
}
```

```js
// Cell: print — first 200 rows of Table 4
html`<p><b>Table 4 — first 200 of ${table4_window_hotspots.length.toLocaleString()} rows</b></p>
${Inputs.table(table4_window_hotspots.slice(0, 200), {rows: 25})}`
```

```js
// Cell: representative sample — top 2 stations in each of the 6 panels
table4_sample = d3.groups(table4_window_hotspots, d => d.day_type, d => d.time_window)
  .flatMap(([, wins]) => wins.flatMap(([, rows]) => rows.slice(0, 2)))
```

```js
Inputs.table(table4_sample)
```

```js
Inputs.textarea({value: toMarkdown(table4_sample), rows: 16, width: 1100})
```

```js
downloadCSV(table4_window_hotspots, "table4_window_hotspots.csv")
```

**Sample of processed data:** *(paste here)*
