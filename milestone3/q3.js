(() => {
  const { stations, geography, days } = JSON.parse(document.querySelector("#chart-data").textContent);
  const stationById = d3.index(stations, station => station.id);
  const options = document.querySelector("#station");
  const panels = [
    { key: "weekday", label: "Ordinary weekday" },
    { key: "weekend", label: "Weekend" },
  ];
  const width = 340;
  const height = 392;
  const net = (station, day) => (station.days[day].arrivals - station.days[day].departures) / days[day];
  const maxAbs = d3.max(stations, station => d3.max(panels, panel => Math.abs(net(station, panel.key))));
  const area = d3.scaleLinear([0, maxAbs], [0, 122]);
  const twoDecimals = d3.format(",.2f");
  const signed = d3.format("+,.2f");
  const blue = "#00718c";
  const orange = "#ac451f";

  // Fit a planar Mercator transform to a fixed local window. Both maps use
  // this transform, so every station stays in the same position.
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
  const projection = d3.geoTransform({
    point(lon, lat) {
      this.stream.point(...project([lon, lat]));
    },
  });
  const path = d3.geoPath(projection);
  const coordinates = new Map(stations.map(station => [station.id, project(station.coordinate)]));
  const nearest = d3.Delaunay.from(stations, station => coordinates.get(station.id)[0],
    station => coordinates.get(station.id)[1]);

  d3.select(options).selectAll("option").data([...stations].sort((a, b) =>
    d3.ascending(a.name, b.name) || d3.ascending(a.id, b.id)))
    .join("option").attr("value", station => station.id).text(station => `${station.name} (${station.id})`);

  const maps = [];
  const landmarks = [
    { label: "MANHATTAN", point: [-73.998, 40.763], angle: -61 },
    { label: "QUEENS", point: [-73.929, 40.743] },
    { label: "HUDSON RIVER", point: [-74.016, 40.785], angle: -62 },
  ];

  for (const panel of panels) {
    const figure = d3.select("#maps").append("figure").attr("class", "map-panel");
    figure.append("figcaption").text(`${panel.label} · ${days[panel.key]} days`);
    const svg = figure.append("svg").attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img").attr("aria-label", `${panel.label} Manhattan station net flow map`);
    svg.append("g").selectAll("path").data(geography.features).join("path")
      .attr("d", path).attr("fill-rule", "evenodd")
      .attr("fill", region => region.properties.name === "Manhattan" ? "#fafaf5" : "#e5eae6")
      .attr("stroke", "#adbdbe").attr("stroke-width", .7);
    svg.append("g").selectAll("text").data(landmarks).join("text")
      .attr("transform", item => `translate(${project(item.point).join(",")}) rotate(${item.angle || 0})`)
      .attr("text-anchor", "middle").attr("fill", "#526772").attr("font-size", 9.5)
      .attr("letter-spacing", "1px").text(item => item.label);

    const symbol = d3.symbol()
      .type(station => net(station, panel.key) < 0 ? d3.symbolTriangle : d3.symbolCircle)
      .size(station => net(station, panel.key) === 0 ? 3 : area(Math.abs(net(station, panel.key))));
    const marks = svg.append("g").selectAll("path").data([...stations].sort((a, b) =>
      Math.abs(net(b, panel.key)) - Math.abs(net(a, panel.key))), station => station.id)
      .join("path").attr("class", "station-mark").attr("data-station", station => station.id)
      .attr("d", symbol).attr("transform", station =>
        `translate(${coordinates.get(station.id).join(",")}) rotate(${net(station, panel.key) < 0 ? 180 : 0})`)
      .attr("fill", station => {
        const value = net(station, panel.key);
        return value > 0 ? blue : value < 0 ? orange : "#75858a";
      })
      .attr("opacity", .75);
    marks.append("title").text(station => `${station.name} · ${signed(net(station, panel.key))} trips/day`);
    const ring = svg.append("circle").attr("class", "selection-ring").attr("r", 11).attr("fill", "none")
      .attr("stroke", "#192e39").attr("stroke-width", 1.7).attr("pointer-events", "none");
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
    maps.push({ ring, marks });
  }

  const magnitude = d3.select("#magnitude").append("svg").attr("viewBox", "0 0 104 28")
    .attr("role", "img").attr("aria-label", "Example symbol areas for 5, 15, and 25 net trips per day");
  const sizes = magnitude.selectAll("g").data([5, 15, 25]).join("g")
    .attr("transform", (_, index) => `translate(${13 + index * 37},0)`);
  sizes.append("circle").attr("cy", 8).attr("r", value => Math.sqrt(area(value) / Math.PI))
    .attr("fill", "#6c7d85");
  sizes.append("text").attr("y", 25).attr("text-anchor", "middle").attr("font-size", 10).text(value => value);

  const table = d3.select("#station-details").append("table");
  const caption = table.append("caption");
  table.append("thead").append("tr").selectAll("th")
    .data(["Day type", "Arrivals/day", "Departures/day", "Net/day"])
    .join("th").attr("scope", "col").text(label => label);
  const tableRows = table.append("tbody").selectAll("tr").data(panels).join("tr");
  tableRows.append("th").attr("scope", "row").text(panel => panel.label);
  for (const metric of ["arrivals", "departures", "net"]) {
    tableRows.append("td").attr("class", metric);
  }

  function select(stationId) {
    const station = stationById.get(stationId);
    options.value = stationId;
    const [x, y] = coordinates.get(stationId);
    for (const { ring, marks } of maps) {
      ring.attr("cx", x).attr("cy", y).attr("data-selected", stationId);
      marks.attr("opacity", item => item.id === stationId ? 1 : .75);
    }
    caption.text(`${station.name} (${station.id})`);
    for (const metric of ["arrivals", "departures"]) {
      tableRows.select(`.${metric}`).text(panel => twoDecimals(station.days[panel.key][metric] / days[panel.key]));
    }
    tableRows.select(".net").attr("class", panel => {
      const value = net(station, panel.key);
      return value > 0 ? "net inflow" : value < 0 ? "net outflow" : "net";
    }).text(panel => net(station, panel.key) === 0 ? "0.00" : signed(net(station, panel.key)));
  }

  options.addEventListener("change", () => select(options.value));
  select(stationById.has("5374.01") ? "5374.01" : stations[0].id);
})();
