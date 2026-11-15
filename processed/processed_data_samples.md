# Processed Data Samples - Citi Bike, September 2026

Input: 202609-citibike-tripdata_1.csv, 202609-citibike-tripdata_2.csv, 202609-citibike-tripdata_3.csv, 202609-citibike-tripdata_4.csv, 202609-citibike-tripdata_5.csv

Days used: Weekday = 21, Weekend = 8

## Cleaning log

| step | rows |
| --- | --- |
| Raw rows loaded | 4982855 |
| Removed: duplicate ride_id | 0 |
| Removed: start date outside Sept 2026 | 549 |
| Removed: Labor Day (Sept 7) | 159474 |
| Removed: missing station/coordinates | 16477 |
| Removed: duration < 1 or > 180 min | 2815 |
| Trips kept for analysis | 4803540 |

## Cleaned trips (first 10 rows)

Full table: 4,803,540 rows

| ride_id | date | hour | day_type | user_type | rideable_type | start_station_id | start_station_name | start_lat | start_lng | end_station_id | end_station_name | end_lat | end_lng | duration_min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 61464625DCADD70E | 2026-09-05 | 18 | Weekend | Member | electric_bike | 7540.02 | E 114 St & 1 Ave | 40.7945663 | -73.9362541 | 7723.01 | St Nicholas Ave & Manhattan Ave | 40.809725 | -73.953149 | 10.42 |
| 1B47FBEAD1730C9B | 2026-09-09 | 16 | Weekday | Member | classic_bike | 4962.09 | Pearl St & Whitehall St | 40.703144 | -74.013178 | 7207.08 | W 70 St & Amsterdam Ave | 40.77748046 | -73.98288594 | 44.75 |
| A121100855D06FC7 | 2026-09-14 | 18 | Weekday | Member | classic_bike | 5886.13 | E 20 St & FDR Dr | 40.733208626522426 | -73.9756813647 | 6364.07 | 6 Ave & W 33 St | 40.74901271 | -73.98848395 | 13.89 |
| 479C15F299F1B8C6 | 2026-09-08 | 15 | Weekday | Member | electric_bike | 5270.09 | Market St & Henry St | 40.71310702305908 | -73.99446353316307 | 5391.06 | Lispenard St & Broadway | 40.71939226 | -74.00247214 | 12.74 |
| CE953E2C43D3E69D | 2026-09-03 | 0 | Weekday | Member | electric_bike | 6593.15 | 6 Ave & W 45 St | 40.756951 | -73.982631 | 6364.07 | 6 Ave & W 33 St | 40.74901271 | -73.98848395 | 9.6 |
| 71653A90E3F762CD | 2026-09-12 | 20 | Weekend | Member | electric_bike | 4095.10 | Van Brunt St & Van Dyke St | 40.6758329439129 | -74.01472628116608 | 7207.08 | W 70 St & Amsterdam Ave | 40.77748046 | -73.98288594 | 45.93 |
| C01703403FB95D1A | 2026-09-14 | 15 | Weekday | Member | classic_bike | 5626.15 | 1 Ave & E 6 St | 40.72633085971696 | -73.98616880178452 | 5905.12 | Broadway & E 14 St | 40.73454567 | -73.99074142 | 18.9 |
| 63ACB4A12B17F178 | 2026-09-03 | 8 | Weekday | Member | electric_bike | 5626.15 | 1 Ave & E 6 St | 40.72633085971696 | -73.98616880178452 | 5905.12 | Broadway & E 14 St | 40.73454567 | -73.99074142 | 4.69 |
| AFC17F8BD98A06D7 | 2026-09-05 | 20 | Weekend | Member | electric_bike | 5270.09 | Market St & Henry St | 40.71310702305908 | -73.99446353316307 | 5905.12 | Broadway & E 14 St | 40.73454567 | -73.99074142 | 10.41 |
| 08940704AC859DDA | 2026-09-08 | 17 | Weekday | Member | electric_bike | 5626.15 | 1 Ave & E 6 St | 40.72633085971696 | -73.98616880178452 | 5905.12 | Broadway & E 14 St | 40.73454567 | -73.99074142 | 6.4 |

## Table 1 - Hourly departures, Weekday vs Weekend (selected hours)

Full table: 48 rows

| day_type | hour | total_departures | n_days | avg_daily_departures |
| --- | --- | --- | --- | --- |
| Weekday | 0 | 38565 | 21 | 1836.4 |
| Weekday | 5 | 30748 | 21 | 1464.2 |
| Weekday | 8 | 290293 | 21 | 13823.5 |
| Weekday | 12 | 164359 | 21 | 7826.6 |
| Weekday | 17 | 390701 | 21 | 18604.8 |
| Weekday | 22 | 115200 | 21 | 5485.7 |
| Weekend | 0 | 31284 | 8 | 3910.5 |
| Weekend | 5 | 4310 | 8 | 538.8 |
| Weekend | 8 | 22570 | 8 | 2821.2 |
| Weekend | 12 | 69988 | 8 | 8748.5 |
| Weekend | 17 | 78692 | 8 | 9836.5 |
| Weekend | 22 | 33551 | 8 | 4193.9 |

## Table 2 - Member vs Casual hourly share (08, 14, 17 h)

Full table: 96 rows

| day_type | user_type | hour | departures | group_total | hour_share |
| --- | --- | --- | --- | --- | --- |
| Weekday | Member | 8 | 261731 | 3161064 | 0.0828 |
| Weekday | Member | 14 | 159707 | 3161064 | 0.0505 |
| Weekday | Member | 17 | 330493 | 3161064 | 0.1046 |
| Weekday | Casual | 8 | 28562 | 620741 | 0.046 |
| Weekday | Casual | 14 | 38585 | 620741 | 0.0622 |
| Weekday | Casual | 17 | 60208 | 620741 | 0.097 |
| Weekend | Member | 8 | 18325 | 759436 | 0.0241 |
| Weekend | Member | 14 | 56901 | 759436 | 0.0749 |
| Weekend | Member | 17 | 57574 | 759436 | 0.0758 |
| Weekend | Casual | 8 | 4245 | 262299 | 0.0162 |
| Weekend | Casual | 14 | 21174 | 262299 | 0.0807 |
| Weekend | Casual | 17 | 21118 | 262299 | 0.0805 |

## Table 3 - Station net flow (top 3 inflow / outflow per day type)

Full table: 4,803 rows

| day_type | station_id | station_name | lat | lng | avg_daily_arrivals | avg_daily_departures | avg_daily_net_inflow | net_inflow_abs | flow_direction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Weekday | 5730.08 | Greenwich St & W Houston St | 40.728846 | -74.008591 | 338.05 | 311.86 | 26.19 | 26.19 | Net inflow |
| Weekday | 6450.05 | 8 Ave & W 31 St | 40.750585 | -73.994685 | 467.48 | 454.43 | 13.05 | 13.05 | Net inflow |
| Weekday | 7286.02 | E 93 St & 2 Ave | 40.782454 | -73.94892 | 107.1 | 96.29 | 10.81 | 10.81 | Net inflow |
| Weekday | 6389.09 | E 39 St & Lexington Ave | 40.749499 | -73.977292 | 273.57 | 301.19 | -27.62 | 27.62 | Net outflow |
| Weekday | 6280.13 | E 33 St & Park Ave | 40.746525 | -73.982143 | 140.0 | 161.9 | -21.9 | 21.9 | Net outflow |
| Weekday | 4611.03 | Willoughby Ave & Hall St | 40.69196 | -73.965369 | 183.33 | 203.52 | -20.19 | 20.19 | Net outflow |
| Weekend | 6492.04 | W 33 St & 10 Ave | 40.753773 | -73.999376 | 97.38 | 71.88 | 25.5 | 25.5 | Net inflow |
| Weekend | 4013.08 | Columbia St & Lorraine St | 40.674706 | -74.007557 | 28.75 | 14.75 | 14.0 | 14.0 | Net inflow |
| Weekend | 6822.09 | 1 Ave & E 68 St | 40.765005 | -73.958185 | 190.75 | 177.25 | 13.5 | 13.5 | Net inflow |
| Weekend | 6230.04 | FDR Drive & E 35 St | 40.744219 | -73.971212 | 168.12 | 191.62 | -23.5 | 23.5 | Net outflow |
| Weekend | 6450.05 | 8 Ave & W 31 St | 40.750585 | -73.994685 | 206.75 | 227.25 | -20.5 | 20.5 | Net outflow |
| Weekend | 6345.08 | E 39 St & 2 Ave | 40.748033 | -73.973828 | 119.25 | 138.88 | -19.62 | 19.62 | Net outflow |

## Table 4 - Departure hotspots by time window (top 2 per panel)

Full table: 14,099 rows

| day_type | time_window | window_hours | station_id | station_name | lat | lng | total_departures | n_days | avg_daily_departures |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Weekday | Morning | 06:00-09:59 | 6432.09 | Park Ave & E 42 St | 40.751873 | -73.977706 | 3495 | 21 | 166.43 |
| Weekday | Morning | 06:00-09:59 | 6331.01 | W 31 St & 7 Ave | 40.749156 | -73.9916 | 2706 | 21 | 128.86 |
| Weekday | Midday | 11:00-14:59 | 6140.05 | W 21 St & 6 Ave | 40.74174 | -73.994156 | 2843 | 21 | 135.38 |
| Weekday | Midday | 11:00-14:59 | 6948.10 | Broadway & W 58 St | 40.766953 | -73.981693 | 2777 | 21 | 132.24 |
| Weekday | Evening | 16:00-19:59 | 6492.08 | 9 Ave & W 33 St | 40.752568 | -73.996765 | 5875 | 21 | 279.76 |
| Weekday | Evening | 16:00-19:59 | 6140.05 | W 21 St & 6 Ave | 40.74174 | -73.994156 | 5389 | 21 | 256.62 |
| Weekend | Morning | 06:00-09:59 | 6726.01 | 11 Ave & W 41 St | 40.760301 | -73.998842 | 280 | 8 | 35.0 |
| Weekend | Morning | 06:00-09:59 | 6876.04 | Central Park S & 6 Ave | 40.765909 | -73.976342 | 258 | 8 | 32.25 |
| Weekend | Midday | 11:00-14:59 | 6233.04 | Pier 61 at Chelsea Piers | 40.746872 | -74.00821 | 1300 | 8 | 162.5 |
| Weekend | Midday | 11:00-14:59 | 6876.04 | Central Park S & 6 Ave | 40.765909 | -73.976342 | 1270 | 8 | 158.75 |
| Weekend | Evening | 16:00-19:59 | 6233.04 | Pier 61 at Chelsea Piers | 40.746872 | -74.00821 | 1272 | 8 | 159.0 |
| Weekend | Evening | 16:00-19:59 | 6876.04 | Central Park S & 6 Ave | 40.765909 | -73.976342 | 1129 | 8 | 141.12 |
