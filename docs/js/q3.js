// Q3 — Station net inflow / outflow: ordinary weekdays vs weekends (Manhattan, Sept 2026).
// Data: data/q3.json (same payload as the notebook), converted by rowsQ3() below to rows of
//   day_type, station_id, station_name, lat, lng,
//   avg_daily_arrivals, avg_daily_departures, avg_daily_net_inflow (= arrivals − departures), ...
// Geography: manhattan.geojson (NYC borough boundary, simplified)

function drawQ3(container, rows, geo) {
  const { DAY_TYPES, DAY, fmt1 } = CB;
  const tip = CB.tip();
  const PW = 440, PH = 720, GAP = 24, TOP = 30;
  const W = PW * 2 + GAP, H = TOP + PH;

  // Both maps: same projection (extent) and same symbol-area scale.
  const projection = CB.manhattanProjection(geo, PW, PH);
  const path = d3.geoPath(projection);
  const maxAbs = d3.max(rows, r => Math.abs(r.avg_daily_net_inflow));
  const area = d3.scaleLinear().domain([0, maxAbs]).range([0, 600]);   // px², area ∝ |net flow|

  const byStation = d3.group(rows, r => r.station_id);
  let selected = null;

  const root = d3.select(container);

  // Legend: direction (color + shape) and magnitude (symbol area).
  const legend = root.append("div").attr("class", "legend");
  const symbolSvg = (dir, size) => {
    const r = Math.sqrt(size) + 2;
    const s = d3.symbol(dir > 0 ? d3.symbolCircle : d3.symbolTriangle, size)();
    return `<svg width="${2 * r}" height="${2 * r}" aria-hidden="true"><path d="${s}" transform="translate(${r},${r}) rotate(${dir > 0 ? 0 : 180})" style="fill:${dir > 0 ? "var(--inflow)" : "var(--outflow)"};fill-opacity:.75;stroke:var(--surface)"/></svg>`;
  };
  legend.append("span").attr("class", "key").html(`${symbolSvg(1, 120)} Net inflow (more arrivals than departures)`);
  legend.append("span").attr("class", "key").html(`${symbolSvg(-1, 120)} Net outflow (more departures than arrivals)`);
  const refs = [10, 25, 50].filter(v => v < maxAbs);
  legend.append("span").attr("class", "key").html("Symbol area = |net flow| per day: " +
    refs.map(v => `${symbolSvg(1, area(v)).replace("var(--inflow)", "none").replace("stroke:var(--surface)", "stroke:var(--text-secondary)")} ${v}`).join(" "));

  const svg = root.append("div").attr("class", "chart").append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
    .attr("aria-label", "Two maps of Manhattan showing each station's average daily net inflow or outflow on weekdays and weekends");

  const panels = DAY_TYPES.map((day, i) => {
    const g = svg.append("g").attr("transform", `translate(${i * (PW + GAP)},0)`);
    g.append("text").attr("class", "title").attr("x", 8).attr("y", 18)
      .text(`${DAY[day].label}s (avg of ${DAY[day].days} days)`);
    const map = g.append("g").attr("transform", `translate(0,${TOP})`);
    map.append("path").datum(geo).attr("class", "land").attr("d", path);

    const data = rows.filter(r => r.day_type === day)
      .map(r => ({ ...r, xy: projection([r.lng, r.lat]) }))
      .sort((a, b) => Math.abs(b.avg_daily_net_inflow) - Math.abs(a.avg_daily_net_inflow)); // big first, small on top

    // Faint dot for every station (context), then the net-flow symbols.
    map.append("g").selectAll("circle").data(data).join("circle")
      .attr("cx", d => d.xy[0]).attr("cy", d => d.xy[1]).attr("r", 1)
      .style("fill", "var(--text-muted)").style("opacity", .5);

    const sym = map.append("g").selectAll("path").data(data.filter(d => d.avg_daily_net_inflow !== 0)).join("path")
      .attr("d", d => d3.symbol(d.avg_daily_net_inflow > 0 ? d3.symbolCircle : d3.symbolTriangle,
                                area(Math.abs(d.avg_daily_net_inflow)))())
      .attr("transform", d => `translate(${d.xy[0]},${d.xy[1]}) rotate(${d.avg_daily_net_inflow > 0 ? 0 : 180})`)
      .style("fill", d => d.avg_daily_net_inflow > 0 ? "var(--inflow)" : "var(--outflow)")
      .style("fill-opacity", .72)
      .style("stroke", "var(--surface)").style("stroke-width", .75)
      .style("cursor", "pointer")
      .on("pointermove", (event, d) => tip.show(
        `<div class="tt-title">${d.station_name}</div>` +
        `<div class="tt-row"><span>${DAY[day].label}</span><b>${d.avg_daily_net_inflow > 0 ? "+" : ""}${fmt1(d.avg_daily_net_inflow)} bikes / day</b></div>` +
        `<div class="note">Click to compare weekday and weekend</div>`, event))
      .on("pointerleave", () => tip.hide())
      .on("click", (event, d) => { select(selected === d.station_id ? null : d.station_id); event.stopPropagation(); });

    // Highlight ring for the selected station (drawn in both maps).
    const ring = map.append("circle").attr("r", 0).style("fill", "none")
      .style("stroke", "var(--highlight)").style("stroke-width", 2).style("pointer-events", "none");
    return { day, data, sym, ring };
  });

  svg.on("click", () => select(null));

  const detail = root.append("div").attr("class", "detail").attr("aria-live", "polite");

  function select(id) {
    selected = id;
    for (const p of panels) {
      p.sym.style("fill-opacity", d => id == null || d.station_id === id ? .72 : .25);
      const d = p.data.find(d => d.station_id === id);
      p.ring.attr("r", d ? Math.max(6, Math.sqrt(area(Math.abs(d.avg_daily_net_inflow)) / Math.PI) + 4) : 0)
        .attr("cx", d ? d.xy[0] : 0).attr("cy", d ? d.xy[1] : 0);
    }
    if (id == null) {
      detail.html("Select a station on either map to see its arrivals, departures and net flow for both day types.");
      return;
    }
    const recs = byStation.get(id);
    const sign = v => (v > 0 ? "+" : "") + fmt1(v);
    detail.html(`<b style="color:var(--text-primary)">${recs[0].station_name}</b>
      <table><thead><tr><th>Day type</th><th>Arrivals / day</th><th>Departures / day</th><th>Net / day</th></tr></thead><tbody>
      ${DAY_TYPES.map(day => {
        const r = recs.find(r => r.day_type === day);
        return r ? `<tr><td>${DAY[day].label}</td><td>${fmt1(r.avg_daily_arrivals)}</td><td>${fmt1(r.avg_daily_departures)}</td><td>${sign(r.avg_daily_net_inflow)}</td></tr>`
                 : `<tr><td>${DAY[day].label}</td><td colspan="3">no trips</td></tr>`;
      }).join("")}</tbody></table>`);
  }
  select(null);

  // Table view: strongest inflow and outflow stations per day type.
  const details = root.append("details");
  details.append("summary").text("Show top-15 inflow and outflow stations");
  const top = DAY_TYPES.flatMap(day => {
    const d = rows.filter(r => r.day_type === day);
    return [...d3.sort(d, r => -r.avg_daily_net_inflow).slice(0, 15),
            ...d3.sort(d, r => r.avg_daily_net_inflow).slice(0, 15)];
  });
  CB.dataTable(details.node(), top, [
    { key: "day_type", label: "Day type" },
    { key: "station_name", label: "Station" },
    { key: "avg_daily_arrivals", label: "Arrivals / day", format: fmt1 },
    { key: "avg_daily_departures", label: "Departures / day", format: fmt1 },
    { key: "avg_daily_net_inflow", label: "Net / day", format: fmt1 },
  ]);

  return svg.node();
}

// Payload (same as the notebook): {stations: [{id, name, coordinate: [lon, lat],
// days: {weekday: {arrivals, departures}, weekend: {...}}}], days: {weekday: 21, weekend: 8}}
// → one row per station and day type, as daily averages. Station IDs stay strings.
function rowsQ3({ stations, days }) {
  return stations.flatMap(s => Object.keys(days).map(day => {
    const { arrivals, departures } = s.days[day];
    return {
      day_type: day === "weekday" ? "Weekday" : "Weekend",
      station_id: s.id, station_name: s.name, lng: s.coordinate[0], lat: s.coordinate[1],
      avg_daily_arrivals: arrivals / days[day],
      avg_daily_departures: departures / days[day],
      avg_daily_net_inflow: (arrivals - departures) / days[day],
    };
  })).filter(r => r.avg_daily_arrivals + r.avg_daily_departures > 0);
}

if (typeof document !== "undefined" && document.getElementById("q3-chart")) {
  Promise.all([d3.json("data/q3.json"), d3.json("data/manhattan.geojson")])
    .then(([payload, geo]) => drawQ3("#q3-chart", rowsQ3(payload), geo));
}
