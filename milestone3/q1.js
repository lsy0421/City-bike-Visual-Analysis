(() => {
  const rows = JSON.parse(document.querySelector("#chart-data").textContent);
  const chart = document.querySelector("#hourly-chart");
  const input = document.querySelector("#hour");
  const hourLabel = document.querySelector("#hour-label");
  const details = d3.select("#hour-details");
  const series = [
    { day: "weekday", label: "Ordinary weekday", color: "#00718c", dash: null },
    { day: "weekend", label: "Weekend", color: "#ac451f", dash: "6 4" },
  ];
  const byDay = d3.group(rows, row => row.day);
  const rowAt = d3.index(rows, row => row.day, row => row.hour);
  const hourText = hour => String(hour).padStart(2, "0") + ":00";
  const countText = d3.format(",d");
  const averageText = d3.format(",.1f");
  const mean = row => row.count / row.days;
  const visible = new Set(series.map(item => item.day));
  let selectedHour = Number(input.value);
  let updateMarks = () => {};

  const table = details.append("table");
  table.append("caption").attr("class", "sr-only").text("Selected hour values");
  table.append("thead").append("tr").selectAll("th")
    .data(["Day type", "Total trips", "Days", "Trips/day"])
    .join("th").attr("scope", "col").text(label => label);
  const tableBody = table.append("tbody");

  function update() {
    input.value = selectedHour;
    hourLabel.textContent = hourText(selectedHour);
    input.setAttribute("aria-valuetext", hourText(selectedHour));
    tableBody.selectAll("tr")
      .data(series.filter(item => visible.has(item.day)), item => item.day)
      .join(enter => {
        const row = enter.append("tr");
        row.append("th").attr("scope", "row");
        row.append("td").attr("class", "count");
        row.append("td").attr("class", "days");
        row.append("td").attr("class", "mean");
        return row;
      })
      .each(function (item) {
        const row = rowAt.get(item.day).get(selectedHour);
        const cells = d3.select(this);
        cells.select("th").text(item.label);
        cells.select(".count").text(countText(row.count));
        cells.select(".days").text(row.days);
        cells.select(".mean").text(averageText(mean(row)));
      });
    updateMarks();
  }

  function draw() {
    const width = Math.max(280, chart.clientWidth);
    const height = 284;
    const margin = { top: 25, right: 15, bottom: 46, left: 58 };
    const right = width - margin.right;
    const bottom = height - margin.bottom;
    const x = d3.scaleLinear([0, 23], [margin.left, right]);
    const y = d3.scaleLinear([0, d3.max(rows, mean)], [bottom, margin.top]).nice();
    const xAxis = d3.axisBottom(x).tickValues(width < 500 ? [0, 6, 12, 18, 23] : [0, 4, 8, 12, 16, 20, 23])
      .tickFormat(hourText).tickSizeOuter(0);

    chart.replaceChildren();
    const svg = d3.select(chart).append("svg").attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img").attr("aria-label", "Average departure trips by hour, ordinary weekdays and weekends.");
    svg.append("g").attr("class", "grid").attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-(right - margin.left)).tickFormat(""))
      .call(group => group.select(".domain").remove());
    svg.append("g").attr("transform", `translate(0,${bottom})`).call(xAxis);
    svg.append("g").attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));
    svg.append("text").attr("class", "axis-title").attr("x", margin.left).attr("y", 14)
      .text("Average departures (trips/day)");
    svg.append("text").attr("class", "axis-title").attr("x", (right + margin.left) / 2)
      .attr("y", height - 5).attr("text-anchor", "middle").text("Departure hour (New York local time)");

    const line = d3.line().x(row => x(row.hour)).y(row => y(mean(row)));
    const paths = svg.selectAll("path.series").data(series).join("path")
      .attr("class", "series").attr("data-day", item => item.day)
      .attr("d", item => line(byDay.get(item.day)))
      .attr("fill", "none").attr("stroke", item => item.color)
      .attr("stroke-width", 2.5).attr("stroke-dasharray", item => item.dash);
    const guide = svg.append("line").attr("y1", margin.top).attr("y2", bottom)
      .attr("stroke", "#6d838d").attr("stroke-dasharray", "3 4");
    const points = svg.selectAll("circle.focus").data(series).join("circle").attr("class", "focus")
      .attr("r", 4.3).attr("fill", item => item.color).attr("stroke", "white").attr("stroke-width", 1.5);
    svg.append("rect").attr("class", "hour-hit").attr("x", margin.left).attr("y", margin.top)
      .attr("width", right - margin.left).attr("height", bottom - margin.top).attr("fill", "transparent")
      .on("pointermove click", event => {
        const [pointerX] = d3.pointer(event, svg.node());
        const nextHour = Math.max(0, Math.min(23, Math.round(x.invert(pointerX))));
        if (nextHour !== selectedHour) {
          selectedHour = nextHour;
          update();
        }
      });
    updateMarks = () => {
      guide.attr("x1", x(selectedHour)).attr("x2", x(selectedHour));
      paths.attr("display", item => visible.has(item.day) ? null : "none");
      points.attr("cx", x(selectedHour))
        .attr("cy", item => y(mean(rowAt.get(item.day).get(selectedHour))))
        .attr("display", item => visible.has(item.day) ? null : "none");
    };
    update();
  }

  input.addEventListener("input", () => {
    selectedHour = Number(input.value);
    update();
  });
  document.querySelectorAll("button[data-day]").forEach(button => {
    button.addEventListener("click", () => {
      const day = button.dataset.day;
      if (visible.has(day)) {
        if (visible.size === 1) return;
        visible.delete(day);
      } else {
        visible.add(day);
      }
      button.setAttribute("aria-pressed", String(visible.has(day)));
      update();
    });
  });
  draw();
  new ResizeObserver(draw).observe(chart);
})();
