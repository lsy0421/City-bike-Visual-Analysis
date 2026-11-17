// Q1 — Average hourly departures: ordinary weekdays vs weekends (Manhattan, Sept 2026).
// Data: data/q1.json, exported from manhattan-data by docs/build_data.py (same payload as the notebook)

function drawQ1(container, rows) {
  const { DAY_TYPES, DAY, fmtInt, hourLabel, hourRange } = CB;
  const tip = CB.tip();
  const W = 960, H = 440, M = { top: 24, right: 120, bottom: 44, left: 64 };

  const series = DAY_TYPES.map(day => ({
    day,
    values: rows.filter(r => r.day_type === day).sort((a, b) => a.hour - b.hour),
  }));
  const visible = new Set(DAY_TYPES);

  const x = d3.scaleLinear().domain([0, 23]).range([M.left, W - M.right]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(rows, r => r.avg_daily_departures)]).nice()
    .range([H - M.bottom, M.top]);

  const root = d3.select(container);

  // Legend = toggle buttons (show / hide a series and its tooltip value).
  const legend = root.append("div").attr("class", "legend");
  legend.selectAll("button").data(DAY_TYPES).join("button")
    .attr("type", "button").attr("aria-pressed", "true")
    .html(d => `${CB.lineSwatch(DAY[d].color, DAY[d].dash)}<span class="swatch-label">${DAY[d].label} (${DAY[d].days} days)</span>`)
    .on("click", function (event, d) {
      if (visible.has(d) && visible.size === 1) return;   // keep at least one series
      visible.has(d) ? visible.delete(d) : visible.add(d);
      d3.select(this).attr("aria-pressed", visible.has(d));
      update();
    });

  const svg = root.append("div").attr("class", "chart").append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("role", "img")
    .attr("aria-label", "Line chart of average departures per day by hour, ordinary weekdays versus weekends");

  svg.append("g").attr("class", "grid")
    .attr("transform", `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickSize(-(W - M.left - M.right)).tickFormat(""));

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(12).tickFormat(hourLabel));
  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${M.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(fmtInt));

  svg.append("text").attr("x", M.left).attr("y", M.top - 10)
    .text("Average departures per day (trips)");
  svg.append("text").attr("x", W - M.right).attr("y", H - 8).attr("text-anchor", "end")
    .text("Departure hour (local time)");

  const line = d3.line().x(d => x(d.hour)).y(d => y(d.avg_daily_departures)).curve(d3.curveMonotoneX);

  const lines = svg.append("g").selectAll("g").data(series).join("g");
  lines.append("path")
    .attr("d", s => line(s.values))
    .style("fill", "none")
    .style("stroke", s => DAY[s.day].color)
    .style("stroke-width", 2.5)
    .style("stroke-linejoin", "round")
    .style("stroke-dasharray", s => DAY[s.day].dash);
  // Direct label at the right end of each line, nudged apart so the two never overlap.
  const ends = series.map(s => y(s.values[23].avg_daily_departures));
  const [hi, lo] = ends[0] <= ends[1] ? [0, 1] : [1, 0];
  if (ends[lo] - ends[hi] < 16) {
    const mid = (ends[lo] + ends[hi]) / 2;
    ends[hi] = mid - 8; ends[lo] = mid + 8;
  }
  lines.append("text")
    .attr("x", x(23) + 8)
    .attr("y", (s, i) => ends[i])
    .attr("dy", "0.35em")
    .style("fill", "var(--text-primary)")
    .text(s => s.day === "Weekday" ? "Weekday" : "Weekend");

  // Hover layer: vertical rule + one dot per visible series + tooltip with both values.
  const focus = svg.append("g").style("display", "none");
  const rule = focus.append("line").attr("y1", M.top).attr("y2", H - M.bottom)
    .style("stroke", "var(--axis)").style("stroke-width", 1);
  const dots = focus.selectAll("circle").data(series).join("circle").attr("r", 5)
    .style("fill", s => DAY[s.day].color).style("stroke", "var(--surface)").style("stroke-width", 2);

  svg.append("rect")
    .attr("x", M.left).attr("y", M.top)
    .attr("width", W - M.left - M.right).attr("height", H - M.top - M.bottom)
    .style("fill", "transparent")
    .on("pointerenter", () => focus.style("display", null))
    .on("pointerleave", () => { focus.style("display", "none"); tip.hide(); })
    .on("pointermove", event => {
      const [mx] = d3.pointer(event);
      const h = Math.max(0, Math.min(23, Math.round(x.invert(mx))));
      rule.attr("x1", x(h)).attr("x2", x(h));
      dots.attr("cx", x(h))
        .attr("cy", s => y(s.values[h].avg_daily_departures))
        .style("display", s => visible.has(s.day) ? null : "none");
      const shown = series.filter(s => visible.has(s.day));
      let html = `<div class="tt-title">${hourRange(h)}</div>` + shown.map(s =>
        CB.swatchRow(DAY[s.day].color, DAY[s.day].dash, DAY[s.day].label,
          `${fmtInt(s.values[h].avg_daily_departures)} / day`)).join("");
      if (shown.length === 2) {
        const r = series[1].values[h].avg_daily_departures / series[0].values[h].avg_daily_departures;
        html += `<div class="note">Weekend ÷ weekday: ${r.toFixed(2)}×</div>`;
      }
      tip.show(html, event);
    });

  function update() {
    lines.transition().duration(200).style("opacity", s => visible.has(s.day) ? 1 : 0);
  }

  // Table view (accessibility / exact values).
  const details = root.append("details");
  details.append("summary").text("Show data table");
  const byHour = d3.range(24).map(h => ({
    hour: h,
    Weekday: series[0].values[h].avg_daily_departures,
    Weekend: series[1].values[h].avg_daily_departures,
  }));
  CB.dataTable(details.node(), byHour, [
    { key: "hour", label: "Hour", format: hourRange },
    { key: "Weekday", label: "Weekday avg / day", format: fmtInt },
    { key: "Weekend", label: "Weekend avg / day", format: fmtInt },
  ]);

  return svg.node();
}

// Payload (same as the notebook, from milestone3/charts.py): [{day, hour, count, days}]
function rowsQ1(payload) {
  return payload.map(r => ({
    day_type: r.day === "weekday" ? "Weekday" : "Weekend",
    hour: r.hour,
    avg_daily_departures: r.count / r.days,
  }));
}

if (typeof document !== "undefined" && document.getElementById("q1-chart")) {
  d3.json("data/q1.json").then(payload => drawQ1("#q1-chart", rowsQ1(payload)));
}
