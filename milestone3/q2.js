(() => {
  const rows = JSON.parse(document.querySelector("#chart-data").textContent);
  const chart = document.querySelector("#share-chart");
  const input = document.querySelector("#hour");
  const hourLabel = document.querySelector("#hour-label");
  const details = d3.select("#hour-details");
  const series = [
    { day: "weekday", label: "Ordinary weekday", color: "#00718c", dash: null },
    { day: "weekend", label: "Weekend", color: "#ac451f", dash: "6 4" },
  ];
  const groups = [
    { key: "member", label: "Members" },
    { key: "casual", label: "Casual riders" },
  ];
  // Share = trips in the hour / all trips of the same rider group and day type,
  // so each curve sums to 100% and the two groups can be compared despite their sizes.
  const share = row => row.count / row.total;
  const lineRows = d3.group(rows, row => row.group, row => row.day);
  const rowAt = d3.index(rows, row => row.group, row => row.day, row => row.hour);
  const hourText = hour => String(hour).padStart(2, "0") + ":00";
  const countText = d3.format(",d");
  const percentText = d3.format(".1%");
  let selectedHour = Number(input.value);
  let updateMarks = () => {};

  const table = details.append("table");
  table.append("caption").attr("class", "sr-only").text("Selected hour values");
  table.append("thead").append("tr").selectAll("th")
    .data(["Rider group", "Day type", "Trips in hour", "Group trips", "Share"])
    .join("th").attr("scope", "col").text(label => label);
  const tableBody = table.append("tbody");
  const tableRows = tableBody.selectAll("tr")
    .data(groups.flatMap(group => series.map(item => ({ group, item }))))
    .join("tr");
  tableRows.append("th").attr("scope", "row").text(({ group }) => group.label);
  tableRows.append("td").attr("class", "day").text(({ item }) => item.label);
  for (const metric of ["count", "total", "share"]) tableRows.append("td").attr("class", metric);

  function update() {
    input.value = selectedHour;
    hourLabel.textContent = hourText(selectedHour);
    input.setAttribute("aria-valuetext", hourText(selectedHour));
    tableRows.each(function ({ group, item }) {
      const row = rowAt.get(group.key).get(item.day).get(selectedHour);
      const cells = d3.select(this);
      cells.select(".count").text(countText(row.count));
      cells.select(".total").text(countText(row.total));
      cells.select(".share").text(percentText(share(row)));
    });
    updateMarks();
  }

  function draw() {
    const width = Math.max(280, chart.clientWidth);
    const stacked = width < 560;                         // one column on narrow screens
    const panelWidth = stacked ? width : (width - 24) / 2;
    const panelHeight = 260;
    const margin = { top: 34, right: 12, bottom: 44, left: 48 };
    const height = stacked ? panelHeight * 2 + 12 : panelHeight;
    // One fixed y scale for both panels, so percentages can be compared directly.
    const y = d3.scaleLinear([0, d3.max(rows, share)], [panelHeight - margin.bottom, margin.top]).nice();

    chart.replaceChildren();
    const svg = d3.select(chart).append("svg").attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Share of each rider group's departures by hour, members and casual riders, ordinary weekdays and weekends.");

    const updaters = [];
    groups.forEach((group, index) => {
      const ox = stacked ? 0 : index * (panelWidth + 24);
      const oy = stacked ? index * (panelHeight + 12) : 0;
      const g = svg.append("g").attr("transform", `translate(${ox},${oy})`);
      const right = panelWidth - margin.right;
      const bottom = panelHeight - margin.bottom;
      const x = d3.scaleLinear([0, 23], [margin.left, right]);

      const totals = series.map(item => `${item.day === "weekday" ? "Weekday" : "Weekend"} ${countText(
        rowAt.get(group.key).get(item.day).get(0).total)}`).join(" · ");
      g.append("text").attr("class", "panel-title").attr("x", margin.left).attr("y", 13).text(group.label);
      g.append("text").attr("class", "axis-title").attr("x", margin.left).attr("y", 27).text(`Trips: ${totals}`);

      g.append("g").attr("class", "grid").attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(5).tickSize(-(right - margin.left)).tickFormat(""))
        .call(axis => axis.select(".domain").remove());
      g.append("g").attr("transform", `translate(0,${bottom})`)
        .call(d3.axisBottom(x).tickValues([0, 6, 12, 18, 23]).tickFormat(hourText).tickSizeOuter(0));
      g.append("g").attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")).tickSizeOuter(0));
      g.append("text").attr("class", "axis-title").attr("x", (right + margin.left) / 2)
        .attr("y", panelHeight - 6).attr("text-anchor", "middle").text("Departure hour (local time)");

      const line = d3.line().x(row => x(row.hour)).y(row => y(share(row)));
      g.selectAll("path.series").data(series).join("path").attr("class", "series")
        .attr("d", item => line(lineRows.get(group.key).get(item.day)))
        .attr("fill", "none").attr("stroke", item => item.color)
        .attr("stroke-width", 2.5).attr("stroke-dasharray", item => item.dash);
      const guide = g.append("line").attr("y1", margin.top).attr("y2", bottom)
        .attr("stroke", "#6d838d").attr("stroke-dasharray", "3 4");
      const points = g.selectAll("circle.focus").data(series).join("circle").attr("class", "focus")
        .attr("r", 4.3).attr("fill", item => item.color).attr("stroke", "white").attr("stroke-width", 1.5);
      g.append("rect").attr("x", margin.left).attr("y", margin.top)
        .attr("width", right - margin.left).attr("height", bottom - margin.top).attr("fill", "transparent")
        .on("pointermove click", event => {
          const [pointerX] = d3.pointer(event, g.node());
          const nextHour = Math.max(0, Math.min(23, Math.round(x.invert(pointerX))));
          if (nextHour !== selectedHour) {
            selectedHour = nextHour;
            update();
          }
        });
      updaters.push(() => {
        guide.attr("x1", x(selectedHour)).attr("x2", x(selectedHour));
        points.attr("cx", x(selectedHour))
          .attr("cy", item => y(share(rowAt.get(group.key).get(item.day).get(selectedHour))));
      });
    });
    updateMarks = () => updaters.forEach(fn => fn());
    update();
  }

  input.addEventListener("input", () => {
    selectedHour = Number(input.value);
    update();
  });
  draw();
  new ResizeObserver(draw).observe(chart);
})();
