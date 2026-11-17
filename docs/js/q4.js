// Q4 — Departure hotspots across the day: morning, midday and evening windows,
// ordinary weekdays vs weekends (Manhattan, Sept 2026).
// Data: data/q4.json (same payload as the notebook), converted by rowsQ4() below to rows of
//   day_type, time_window (Morning|Midday|Evening), window_hours, station_id, station_name,
//   lat, lng, total_departures, n_days, avg_daily_departures (within that window)
// Geography: manhattan.geojson

function drawQ4(container, rows, geo) {
  const { DAY_TYPES, DAY, fmt1 } = CB;
  const tip = CB.tip();
  const WINDOWS = [
    { key: "Morning", label: "Morning 07:00–09:59" },
    { key: "Midday",  label: "Midday 11:00–13:59" },
    { key: "Evening", label: "Evening 16:00–18:59" },
  ];
  const PW = 300, PH = 470, GX = 16, GY = 20, LEFT = 28, TOP = 26;
  const W = LEFT + 3 * PW + 2 * GX, H = 2 * (TOP + PH) + GY;

  // All six panels: one projection (same extent) and one symbol-area scale.
  const projection = CB.manhattanProjection(geo, PW, PH, 6);
  const path = d3.geoPath(projection);
  const maxV = d3.max(rows, r => r.avg_daily_departures);
  const r = d3.scaleSqrt().domain([0, maxV]).range([0, 10]);         // radius ∝ √value → area ∝ value

  const root = d3.select(container);
  const legend = root.append("div").attr("class", "legend");
  for (const d of DAY_TYPES) {
    legend.append("span").attr("class", "key").html(
      `<svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="6" style="fill:${DAY[d].color};fill-opacity:.6"/></svg>${DAY[d].label} row`);
  }
  const refs = [10, 50, 100].filter(v => v <= maxV);
  legend.append("span").attr("class", "key").html("Circle area = avg departures per day in the window: " +
    refs.map(v => `<svg width="${2 * r(v) + 2}" height="${2 * r(v) + 2}" aria-hidden="true"><circle cx="${r(v) + 1}" cy="${r(v) + 1}" r="${r(v)}" style="fill:none;stroke:var(--text-secondary)"/></svg> ${v}`).join(" "));

  const svg = root.append("div").attr("class", "chart").append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
    .attr("aria-label", "Six maps of Manhattan: rows are weekday and weekend, columns are morning, midday and evening; circle area shows departures per station");

  const cells = [];
  DAY_TYPES.forEach((day, i) => {
    const y0 = i * (TOP + PH + GY);
    svg.append("text").attr("class", "title")
      .attr("transform", `translate(14,${y0 + TOP + PH / 2}) rotate(-90)`).attr("text-anchor", "middle")
      .text(DAY[day].label);
    WINDOWS.forEach((w, j) => {
      const x0 = LEFT + j * (PW + GX);
      const g = svg.append("g").attr("transform", `translate(${x0},${y0})`);
      const data = rows.filter(d => d.day_type === day && d.time_window === w.key)
        .map(d => ({ ...d, xy: projection([d.lng, d.lat]) }))
        .sort((a, b) => b.avg_daily_departures - a.avg_daily_departures);   // big first, small on top
      const total = d3.sum(data, d => d.avg_daily_departures);
      g.append("text").attr("class", "title").attr("x", 4).attr("y", 16).text(w.label);
      g.append("text").attr("x", PW - 4).attr("y", 16).attr("text-anchor", "end")
        .text(`${d3.format(",.0f")(total)} / day`);
      const map = g.append("g").attr("transform", `translate(0,${TOP})`);
      map.append("path").datum(geo).attr("class", "land").attr("d", path);
      const dots = map.append("g").selectAll("circle").data(data).join("circle")
        .attr("cx", d => d.xy[0]).attr("cy", d => d.xy[1]).attr("r", d => r(d.avg_daily_departures))
        .style("fill", DAY[day].color).style("fill-opacity", .45)
        .style("stroke", "var(--surface)").style("stroke-width", .5)
        .on("pointermove", (event, d) => { highlight(d.station_id); tip.show(
          `<div class="tt-title">${d.station_name}</div>` +
          `<div class="tt-row"><span>${DAY[day].label} · ${w.key}</span><b>${fmt1(d.avg_daily_departures)} departures / day</b></div>` +
          `<div class="note">${d3.format(",")(d.total_departures)} trips over ${d.n_days} days</div>`, event); })
        .on("pointerleave", () => { highlight(null); tip.hide(); });
      const ring = map.append("circle").style("fill", "none").style("stroke", "var(--highlight)")
        .style("stroke-width", 1.5).style("pointer-events", "none").attr("r", 0);
      cells.push({ data, dots, ring });
    });
  });

  // Hovering one station marks the same station in all six panels.
  function highlight(id) {
    for (const c of cells) {
      const d = id == null ? null : c.data.find(d => d.station_id === id);
      c.ring.attr("r", d ? r(d.avg_daily_departures) + 3 : 0)
        .attr("cx", d ? d.xy[0] : 0).attr("cy", d ? d.xy[1] : 0);
      c.dots.style("fill-opacity", id == null ? .45 : .25);
    }
  }

  // Table view: top 10 stations per panel.
  const details = root.append("details");
  details.append("summary").text("Show top-10 stations per panel");
  const top = DAY_TYPES.flatMap(day => WINDOWS.flatMap(w =>
    d3.sort(rows.filter(d => d.day_type === day && d.time_window === w.key), d => -d.avg_daily_departures).slice(0, 10)));
  CB.dataTable(details.node(), top, [
    { key: "day_type", label: "Day type" },
    { key: "time_window", label: "Window" },
    { key: "station_name", label: "Station" },
    { key: "avg_daily_departures", label: "Departures / day", format: fmt1 },
  ]);

  return svg.node();
}

// Payload (same as the notebook): {stations: [{id, name, coordinate, counts: {day: {period: trips}}}],
// days, periods: ["Morning (07–10)", "Midday (11–14)", "Evening (16–19)"]}
// → one row per station, day type and window (zero-departure combinations dropped).
function rowsQ4({ stations, days, periods }) {
  return stations.flatMap(s => Object.keys(days).flatMap(day => periods.map(period => ({
    day_type: day === "weekday" ? "Weekday" : "Weekend",
    time_window: period.split(" ")[0],               // "Morning" | "Midday" | "Evening"
    station_id: s.id, station_name: s.name, lng: s.coordinate[0], lat: s.coordinate[1],
    total_departures: s.counts[day][period],
    n_days: days[day],
    avg_daily_departures: s.counts[day][period] / days[day],
  })))).filter(r => r.total_departures > 0);
}

if (typeof document !== "undefined" && document.getElementById("q4-chart")) {
  Promise.all([d3.json("data/q4.json"), d3.json("data/manhattan.geojson")])
    .then(([payload, geo]) => drawQ4("#q4-chart", rowsQ4(payload), geo));
}
