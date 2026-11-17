# Observable notebook mirror

Optional. The team deliverable is the Jupyter notebook `milestone3/team17-q1-q4.ipynb`. This guide mirrors the static site (`docs/`) in Observable and reuses the same files, so the code and data match the site.

## 1. Attach files
In a new notebook, open **Files (paperclip) → Add** and upload:

| From | Files |
|---|---|
| `docs/data/` | `q1.json`, `q2.json`, `q3.json`, `q4.json`, `manhattan.geojson` (run `python docs/build_data.py` first) |
| `docs/js/` | `common.js`, `q1.js`, `q2.js`, `q3.js`, `q4.js` |
| `docs/css/` | `style.css` |

## 2. Shared cells (paste each into its own JavaScript cell)

```js
d3 = require("d3@7.9.0")
```

```js
// Colors, tooltip and table styles shared by all charts
html`<style>${await FileAttachment("style.css").text()}</style>`
```

```js
// Shared helpers: evaluates common.js and returns its CB object
CB = new Function("d3", (await FileAttachment("common.js").text()) + "; return CB;")(d3)
```

```js
// Load each view's draw function from its file (same code as the site)
loadView = async (file, name) =>
  new Function("d3", "CB", (await FileAttachment(file).text()) + `; return ${name};`)(d3, CB)
```

```js
geo = FileAttachment("manhattan.geojson").json()
```

## 3. One section per question

For each question, add these cells in order: **markdown (question) → chart → code → markdown (what it shows)**. Copy the question and the "What the visualization shows" text from `docs/qN.html`.

**Q1**
```js
{
  const { drawQ1, rowsQ1 } = await loadView("q1.js", "{ drawQ1, rowsQ1 }");
  const rows = rowsQ1(await FileAttachment("q1.json").json());
  const div = html`<div>`;
  drawQ1(div, rows);
  return div;
}
```

**Q2**
```js
{
  const { drawQ2, rowsQ2 } = await loadView("q2.js", "{ drawQ2, rowsQ2 }");
  const rows = rowsQ2(await FileAttachment("q2.json").json());
  const div = html`<div>`;
  drawQ2(div, rows);
  return div;
}
```

**Q3**
```js
{
  const { drawQ3, rowsQ3 } = await loadView("q3.js", "{ drawQ3, rowsQ3 }");
  const rows = rowsQ3(await FileAttachment("q3.json").json());
  const div = html`<div>`;
  drawQ3(div, rows, geo);
  return div;
}
```

**Q4**
```js
{
  const { drawQ4, rowsQ4 } = await loadView("q4.js", "{ drawQ4, rowsQ4 }");
  const rows = rowsQ4(await FileAttachment("q4.json").json());
  const div = html`<div>`;
  drawQ4(div, rows, geo);
  return div;
}
```

**Code cell for each question** (shows the code that draws the chart):
```js
html`<pre class="code">${await FileAttachment("q1.js").text()}</pre>`   // q2.js, q3.js, q4.js likewise
```

Each `qN.js` ends with a page-bootstrap `if (document.getElementById("qN-chart"))` block. In the notebook that element does not exist, so the block is skipped and the cells above supply the data instead.

After publishing, add the notebook link to the main README.
