// Shared helpers for all four views (D3 v7). Loaded before each qN.js.
const CB = (() => {
  const DAY_TYPES = ["Weekday", "Weekend"];
  // Same color + line style for day type in every view (Q1, Q2, Q4).
  const DAY = {
    Weekday: { label: "Ordinary weekday", color: "var(--weekday)", dash: null, days: 21 },
    Weekend: { label: "Weekend",          color: "var(--weekend)", dash: "6 4", days: 8 },
  };

  const fmtInt = d3.format(",.0f");
  const fmt1 = d3.format(",.1f");
  const fmtPct = d3.format(".1%");
  const hourLabel = h => `${String(h).padStart(2, "0")}:00`;
  const hourRange = h => `${hourLabel(h)}–${String(h).padStart(2, "0")}:59`;

  // One shared tooltip element; positioned next to the pointer and kept on screen.
  let tipEl;
  function tip() {
    if (!tipEl) tipEl = d3.select("body").append("div").attr("class", "tooltip").attr("role", "status");
    return {
      show(html, event) {
        tipEl.html(html).style("opacity", 1);
        const node = tipEl.node(), pad = 14;
        const { width, height } = node.getBoundingClientRect();
        let x = event.clientX + pad, y = event.clientY + pad;
        if (x + width > window.innerWidth - 8) x = event.clientX - width - pad;
        if (y + height > window.innerHeight - 8) y = event.clientY - height - pad;
        tipEl.style("left", `${Math.max(8, x)}px`).style("top", `${Math.max(8, y)}px`);
      },
      hide() { tipEl.style("opacity", 0); },
    };
  }

  // A tooltip row with a line swatch in the series color.
  const swatchRow = (color, dash, label, value) =>
    `<div class="tt-row"><span><i class="sw" style="border-color:${color};border-top-style:${dash ? "dashed" : "solid"}"></i>${label}</span><b>${value}</b></div>`;

  // Small inline SVG line swatch for HTML legends.
  const lineSwatch = (color, dash) =>
    `<svg width="26" height="10" aria-hidden="true"><line x1="1" x2="25" y1="5" y2="5" style="stroke:${color};stroke-width:2.5;${dash ? `stroke-dasharray:${dash}` : ""}"/></svg>`;

  // Projection that fits Manhattan into a w×h panel; identical inputs → identical
  // projections, so every map panel shares extent and scale.
  function manhattanProjection(geo, w, h, pad = 8) {
    return d3.geoMercator().fitExtent([[pad, pad], [w - pad, h - pad]], geo);
  }

  // Render rows as an accessible HTML table (the "table view" for each chart).
  function dataTable(container, rows, columns) {
    const wrap = d3.select(container).append("div").attr("class", "table-wrap");
    const t = wrap.append("table").attr("class", "data");
    t.append("thead").append("tr").selectAll("th").data(columns).join("th").text(c => c.label);
    t.append("tbody").selectAll("tr").data(rows).join("tr")
      .selectAll("td").data(r => columns.map(c => (c.format || (v => v))(r[c.key], r)))
      .join("td").text(d => d);
  }

  // Show the actual source file of a view inside a <pre>, so the page always displays the real code.
  async function showCode(selector, url) {
    const el = document.querySelector(selector);
    try {
      el.textContent = await (await fetch(url)).text();
    } catch (e) {
      el.textContent = `// Could not load ${url}: ${e}`;
    }
  }

  return { DAY_TYPES, DAY, fmtInt, fmt1, fmtPct, hourLabel, hourRange, tip, swatchRow,
           lineSwatch, manhattanProjection, dataTable, showCode };
})();
