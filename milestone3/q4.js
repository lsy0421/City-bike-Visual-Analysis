(() => {
  const { stations, geography, days, periods } = JSON.parse(document.querySelector("#chart-data").textContent);
  const stationById = d3.index(stations, station => station.id);
  const options = document.querySelector("#station");
  const dayTypes = [
    { key: "weekday", label: "Ordinary weekday", color: "#00718c" },
    { key: "weekend", label: "Weekend", color: "#ac451f" },
  ];
  const width = 340;
  const height = 392;
  // Average departures per day for one station, day type and three-hour window.
  const rate = (station, day, period) => station.counts[day][period] / days[day];
  const maxRate = d3.max(stations, station =>
    d3.max(dayTypes, day => d3.max(periods, period => rate(station, day.key, period))));
  // One radius scale for all six maps: radius ∝ √value, so circle area ∝ departures/day.
  const radius = d3.scaleSqrt([0, maxRate], [0, 11]);
  const oneDecimal = d3.format(",.1f");

  // Same fixed Mercator window as the Q3 maps, so all views share one extent.
  const mercator = d3.geoMercator().scale(1).translate([0, 0]);
  const upperLeft = mercator([-74.045, 40.890]);
  const lowerRight = mercator([-73.892, 40.672]);
  const scale = Math.min((width - 12) / (lowerRight[0] - upperLeft[0]),
    (height - 12) / (lowerRight[1] - upperLeft[1]));
  const center = upperLeft.map((value, index) => (value + lowerRight[index]) / 2);
  const project = point => {
    const [x, y] = mercator(point);
    return [width / 2 + (x - center[0]) * scale, height / 2 + (y - center[1]) * scale];
  };
  const path = d3.geoPath(d3.geoTransform({
    point(lon, lat) {
      this.stream.point(...project([lon, lat]));
    },
  }));
  const coordinates = new Map(stations.map(station => [station.id, project(station.coordinate)]));
  const nearest = d3.Delaunay.from(stations, station => coordinates.get(station.id)[0],
    station => coordinates.get(station.id)[1]);

  d3.select(options).selectAll("option").data([...stations].sort((a, b) =>
    d3.ascending(a.name, b.name) || d3.ascending(a.id, b.id)))
    .join("option").attr("value", station => station.id).text(station => `${station.name} (${station.id})`);

  // Grid: rows are day types, columns are time windows.
  const grid = d3.select("#hotspot-maps");
  grid.append("div").attr("class", "corner");
  grid.selectAll("div.column-label").data(periods).join("div").attr("class", "column-label").text(period => period);
  const maps = [];
  for (const day of dayTypes) {
    grid.append("div").attr("class", "row-label").append("span").text(day.label);
    for (const period of periods) {
      const total = d3.sum(stations, station => rate(station, day.key, period));
      const figure = grid.append("figure").attr("class", "map-panel");
      figure.append("figcaption").text(`${d3.format(",.0f")(total)} trips/day`);
      const svg = figure.append("svg").attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img").attr("aria-label", `${day.label} ${period} departure hotspots in Manhattan`);
      svg.append("g").selectAll("path").data(geography.features).join("path")
        .attr("d", path).attr("fill-rule", "evenodd")
        .attr("fill", region => region.properties.name === "Manhattan" ? "#fafaf5" : "#e5eae6")
        .attr("stroke", "#adbdbe").attr("stroke-width", .7);
      const marks = svg.append("g").selectAll("circle")
        .data([...stations].filter(station => rate(station, day.key, period) > 0)
          .sort((a, b) => rate(b, day.key, period) - rate(a, day.key, period)), station => station.id)
        .join("circle").attr("data-station", station => station.id)
        .attr("cx", station => coordinates.get(station.id)[0])
        .attr("cy", station => coordinates.get(station.id)[1])
        .attr("r", station => radius(rate(station, day.key, period)))
        .attr("fill", day.color).attr("fill-opacity", .5)
        .attr("stroke", "white").attr("stroke-width", .5);
      marks.append("title").text(station =>
        `${station.name} · ${oneDecimal(rate(station, day.key, period))} departures/day`);
      const ring = svg.append("circle").attr("class", "selection-ring").attr("fill", "none")
        .attr("stroke", "#192e39").attr("stroke-width", 2).attr("pointer-events", "none");
      svg.on("click", event => {
        const direct = event.target.closest("[data-station]");
        if (direct) {
          select(direct.dataset.station);
          return;
        }
        const [x, y] = d3.pointer(event, svg.node());
        const station = stations[nearest.find(x, y)];
        const [sx, sy] = coordinates.get(station.id);
        if (Math.hypot(x - sx, y - sy) < 13) select(station.id);
      });
      maps.push({ day, period, ring });
    }
  }

  const magnitude = d3.select("#magnitude").append("svg").attr("viewBox", "0 0 104 30")
    .attr("role", "img").attr("aria-label", "Example circle areas for 10, 50, and 150 departures per day");
  const sizes = magnitude.selectAll("g").data([10, 50, 150]).join("g")
    .attr("transform", (_, index) => `translate(${14 + index * 37},0)`);
  sizes.append("circle").attr("cy", 10).attr("r", value => radius(value)).attr("fill", "#6c7d85");
  sizes.append("text").attr("y", 29).attr("text-anchor", "middle").attr("font-size", 10).text(value => value);

  const table = d3.select("#station-details").append("table");
  const caption = table.append("caption");
  table.append("thead").append("tr").selectAll("th")
    .data(["Day type", ...periods.map(period => `${period} /day`)])
    .join("th").attr("scope", "col").text(label => label);
  const tableRows = table.append("tbody").selectAll("tr").data(dayTypes).join("tr");
  tableRows.append("th").attr("scope", "row").text(day => day.label);
  periods.forEach((_, index) => tableRows.append("td").attr("class", `p${index}`));

  // Selecting a station outlines it in all six maps and lists its six values.
  function select(stationId) {
    const station = stationById.get(stationId);
    options.value = stationId;
    const [x, y] = coordinates.get(stationId);
    for (const { day, period, ring } of maps) {
      ring.attr("cx", x).attr("cy", y).attr("r", radius(rate(station, day.key, period)) + 4);
    }
    caption.text(`${station.name} (${station.id})`);
    periods.forEach((period, index) => {
      tableRows.select(`.p${index}`).text(day => oneDecimal(rate(station, day.key, period)));
    });
  }

  options.addEventListener("change", () => select(options.value));
  const busiest = d3.greatest(stations, station => rate(station, "weekday", periods[2]));
  select(busiest.id);
})();
