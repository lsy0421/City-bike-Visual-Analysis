# Milestone 3 Q1 and Q3

Open [team17-q1-q3.ipynb](team17-q1-q3.ipynb) in JupyterLab. The notebook includes the research questions, two D3 views, and findings. The published notebook preview on GitHub shows the code and narrative. Run the notebook in Jupyter to use its charts.

From the repository root, using Python 3.12:

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r milestone3/requirements.txt
python -m jupyter lab milestone3/team17-q1-q3.ipynb
```

Select **Kernel → Restart Kernel and Run All Cells**. The notebook reads the existing [Manhattan aggregates and boundary](../manhattan-data/README.md) and embeds its local copy of D3 7.9.0.

- **Q1** compares ordinary weekdays and weekends. Hover over the lines or use the hour slider to inspect counts, days, and trips per day. Use the legend to toggle a series.
- **Q3** uses the same geographic extent, symbol sizes, and station selection on both maps. Click a station or use the drop-down to compare its arrivals, departures, and net flow. The loader adds counts across matching station-ID aliases before calculating the daily rates. It matches IDs differing only by a trailing zero when their station names agree and coordinates are within two metres. The station reconciliation applies to this Q3 view.

The chart inputs and HTML embedding are in [charts.py](charts.py). The D3 code is in [q1.js](q1.js) and [q3.js](q3.js).
