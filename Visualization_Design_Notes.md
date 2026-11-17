
## Scope and revisions

September 2026; trips with both endpoints inside the official Manhattan borough boundary. Ordinary weekdays exclude Labor Day and use 21 days; weekends use 8 days. The overlapping hourly questions are merged, and daily volume is treated as background.

## Q1  Hourly departure patterns

**Question.** How do average hourly departures differ between ordinary weekdays and weekends?

**Processed data.** One row represents a departure hour and day type. Trip counts are divided by the corresponding number of calendar days (21 or 8).

**Visual encoding.** Horizontal position encodes departure hour, and vertical position encodes average departures in trips per day. Ordinary weekdays use a solid blue line; weekends use a dashed orange line. Both share the same axes.

**Intended interaction.** Hover an hour to display both daily averages. Selecting a legend entry shows or hides that series and its tooltip value.

**Reading the view.** The view compares the amount and timing of recorded riding. A peak is not direct evidence of trip purpose.

## Q2  Rider-group departure timing

**Question.** How do member and casual departure-time distributions differ, and how does each change between ordinary weekdays and weekends?

**Processed data.** One row represents a rider category, day type, and hour. Hourly share equals the hourly count divided by all departures within the same rider-category and day-type group. Each curve sums to 100%.

**Visual encoding.** Members and casual riders occupy separate panels with identical axes. Horizontal position encodes hour and vertical position encodes within-group share. Day-type colors and line styles match Q1.

**Intended interaction.** Hover an hour to display the share and underlying trip count. Keep the percentage scale fixed across both panels.

**Reading the view.** Normalization supports comparison of time distributions independently of the different sizes of the two rider groups.

## Q3  Station net inflow and outflow

**Question.** Which stations have net inflow or outflow, and how does the pattern differ between ordinary weekdays and weekends?

**Processed data.** One row represents a station ID and day type. Departures use start times; arrivals use end times. Daily net inflow equals daily average arrivals minus daily average departures.

**Visual encoding.** Both maps share an extent and magnitude scale. Symbol area represents absolute net flow. Blue circles encode positive net inflow; orange downward triangles encode negative net flow.

**Intended interaction.** Selecting a station in either map highlights it in both and displays its arrivals, departures, and net flow for each day type.

**Reading the view.** Recorded flow does not measure actual inventory. The September-start cohort excludes arrivals from trips that departed in August.

## Q4  Departure hotspots across the day

**Question.** How do departure hotspots change across morning, midday, and evening, and how do the patterns differ between ordinary weekdays and weekends?

**Processed data.** One row represents a station, day type, and three-hour window: [07:00, 10:00), [11:00, 14:00), or [16:00, 19:00). Counts are divided by 21 or 8 days.

**Visual encoding.** Rows encode day type; columns encode time window. Circle area represents average departures per day within that window. All six maps use the same extent and symbol-area scale.

**Intended interaction.** Hover a station to display its name and daily average. Keep station locations, map extent, and symbol scales consistent across panels.

**Reading the view.** This view shows departure concentration; Q3 separately shows the difference between arrivals and departures.

## Sources

- https://citibikenyc.com/system-data
- https://data.cityofnewyork.us/City-Government/Borough-Boundaries/gthc-hcne
- https://github.com/lsy0421/City-bike-Visual-Analysis