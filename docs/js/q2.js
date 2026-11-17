// Q2 — Departure-time distribution by rider group: members vs casual riders,
// each compared across ordinary weekdays and weekends (Manhattan, Sept 2026).
// Data: data/q2.json (same payload as the notebook), converted by rowsQ2() below
// hour_share = departures in that hour / all departures of the same rider group & day type,
// so every curve sums to 100% and groups of very different size can be compared.

function drawQ2(container, rows) {
  const { DAY_TYPES, DAY, fmtInt, fmtPct, hourLabel, hourRange } = CB;
  const tip = CB.tip();
  const GROUPS = [
    { key: "Member", label: "Members (annual subscribers)" },
    { key: "Casual", label: "Casual riders (single ride / day pass)" },
  ];
  const PW = 460, PH = 380, GAP = 40;                     // one panel
  const M = { top: 48, right: 16, bottom: 44, left: 56 };
  const W = M.left + PW * 2 + GAP + M.right, H = M.top + PH + M.bottom;

  const get = (u, d) => rows.filter(r => r.user_type === u && r.day_type === d).sort((a, b) => a.hour - b.hour);

  // One fixed y scale for both panels, so shares are directly comparable.
  const y = d3.scaleLinear().domain([0, d3.max(rows, r => r.hour_share)]).nice().range([M.top + PH, M.top]);

  const root = d3.select(container);
  const legend = root.append("div").attr("class", "legend");
  legend.selectAll("span").data(DAY_TYPES).join("span").attr("class", "key")
    .html(d => `${CB.lineSwatch(DAY[d].color, DAY[d].dash)}${DAY[d].label}`);

  const svg = root.append("div").attr("class", "chart").append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
    .attr("aria-label", "Two line-chart panels: share of departures by hour for members and casual riders, weekday versus weekend");

  GROUPS.forEach((g, i) => {
    const x0 = M.left + i * (PW + GAP);
    const x = d3.scaleLinear().domain([0, 23]).range([x0, x0 + PW]);
    const panel = svg.append("g");

    panel.append("text").attr("class", "title").attr("x", x0).attr("y", 18).text(g.label);
    const totals = DAY_TYPES.map(d => `${d}: ${fmtInt(get(g.key, d)[0].group_total)} trips`);
    panel.append("text").attr("x", x0).attr("y", 36).style("font-size", "12px").text(totals.join(" · "));

    panel.append("g").attr("class", "grid").attr("transform", `translate(${x0},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-PW).tickFormat(""));
    panel.append("g").attr("class", "axis").attr("transform", `translate(0,${M.top + PH})`)
      .call(d3.axisBottom(x).tickValues([0, 4, 8, 12, 16, 20]).tickFormat(hourLabel));
    panel.append("g").attr("class", "axis").attr("transform", `translate(${x0},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")));

    const line = d3.line().x(d => x(d.hour)).y(d => y(d.hour_share)).curve(d3.curveMonotoneX);
    const series = DAY_TYPES.map(d => ({ day: d, values: get(g.key, d) }));
    panel.selectAll("path.series").data(series).join("path").attr("class", "series")
      .attr("d", s => line(s.values))
      .style("fill", "none").style("stroke", s => DAY[s.day].color)
      .style("stroke-width", 2.5).style("stroke-dasharray", s => DAY[s.day].dash);

    // Hover: rule + dots + tooltip with share and underlying trip count.
    const focus = panel.append("g").style("display", "none");
    const rule = focus.append("line").attr("y1", M.top).attr("y2", M.top + PH)
      .style("stroke", "var(--axis)");
    const dots = focus.selectAll("circle").data(series).join("circle").attr("r", 5)
      .style("fill", s => DAY[s.day].color).style("stroke", "var(--surface)").style("stroke-width", 2);

    panel.append("rect").attr("x", x0).attr("y", M.top).attr("width", PW).attr("height", PH)
      .style("fill", "transparent")
      .on("pointerenter", () => focus.style("display", null))
      .on("pointerleave", () => { focus.style("display", "none"); tip.hide(); })
      .on("pointermove", event => {
        const h = Math.max(0, Math.min(23, Math.round(x.invert(d3.pointer(event)[0]))));
        rule.attr("x1", x(h)).attr("x2", x(h));
        dots.attr("cx", x(h)).attr("cy", s => y(s.values[h].hour_share));
        tip.show(`<div class="tt-title">${g.key === "Member" ? "Members" : "Casual riders"} · ${hourRange(h)}</div>` +
          series.map(s => CB.swatchRow(DAY[s.day].color, DAY[s.day].dash, DAY[s.day].label,
            `${fmtPct(s.values[h].hour_share)} <span class="note">(${fmtInt(s.values[h].departures)} trips)</span>`)).join(""),
          event);
      });
  });

  svg.append("text").attr("x", W - M.right).attr("y", H - 6).attr("text-anchor", "end")
    .text("Departure hour (local time)");
  svg.append("text").attr("transform", `translate(14,${M.top + PH / 2}) rotate(-90)`)
    .attr("text-anchor", "middle").text("Share of the group's departures");

  // Table view.
  const details = root.append("details");
  details.append("summary").text("Show data table");
  const wide = d3.range(24).map(h => {
    const o = { hour: h };
    for (const g of GROUPS) for (const d of DAY_TYPES) o[`${g.key}_${d}`] = get(g.key, d)[h].hour_share;
    return o;
  });
  CB.dataTable(details.node(), wide, [
    { key: "hour", label: "Hour", format: hourRange },
    ...GROUPS.flatMap(g => DAY_TYPES.map(d => ({ key: `${g.key}_${d}`, label: `${g.key} · ${d}`, format: fmtPct }))),
  ]);

  return svg.node();
}

// Payload (same as the notebook): [{day, group, hour, count, total}]
function rowsQ2(payload) {
  return payload.map(r => ({
    day_type: r.day === "weekday" ? "Weekday" : "Weekend",
    user_type: r.group === "member" ? "Member" : "Casual",
    hour: r.hour,
    departures: r.count,
    group_total: r.total,
    hour_share: r.count / r.total,
  }));
}

if (typeof document !== "undefined" && document.getElementById("q2-chart")) {
  d3.json("data/q2.json").then(payload => drawQ2("#q2-chart", rowsQ2(payload)));
}
