# Milestone 3 Q1–Q4

Open [team17-q1-q4.ipynb](team17-q1-q4.ipynb) in JupyterLab. For each research question the notebook states the question, shows the D3 view and its code, and describes what the view shows. The published notebook preview on GitHub shows the code and narrative. Run the notebook in Jupyter to use its charts.

From the repository root, using Python 3.12:

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r milestone3/requirements.txt
python -m jupyter lab milestone3/team17-q1-q4.ipynb
```

Select **Kernel → Restart Kernel and Run All Cells**. The notebook reads the existing [Manhattan aggregates and boundary](../manhattan-data/README.md) and embeds its local copy of D3 7.9.0.

- **Q1** compares ordinary weekdays and weekends. Hover over the lines or use the hour slider to inspect counts, days, and trips per day. Use the legend to toggle a series.
- **Q2** shows each rider group's hourly share of departures in two panels (members, casual riders) with one fixed percentage scale. Hover over a panel or use the hour slider to compare shares and the trip counts behind them.
- **Q3** uses the same geographic extent, symbol sizes, and station selection on both maps. Click a station or use the drop-down to compare its arrivals, departures, and net flow. The loader adds counts across matching station-ID aliases before calculating the daily rates. It matches IDs differing only by a trailing zero when their station names agree and coordinates are within two metres.
- **Q4** shows departures per day in three-hour windows (07:00, 11:00, 16:00) on six maps with the Q3 extent and one size scale. Click a station or use the drop-down to outline it on every map and list its six values. It uses the same station-ID reconciliation as Q3.

The chart inputs, HTML embedding and `show_code` are in [charts.py](charts.py). The D3 code is in [q1.js](q1.js), [q2.js](q2.js), [q3.js](q3.js) and [q4.js](q4.js).
