# Processed Data Samples - Citi Bike, September 2026

Input: 202609-citibike-tripdata_1.csv

Days used: Weekday = 9, Weekend = 4

## Cleaning log

| step | rows |
| --- | --- |
| Raw rows loaded | 1000000 |
| Removed: duplicate ride_id | 0 |
| Removed: start date outside Sept 2026 | 220 |
| Removed: Labor Day (Sept 7) | 65748 |
| Removed: missing station/coordinates | 2487 |
| Removed: duration < 1 or > 180 min | 641 |
| Trips kept for analysis | 930904 |

## Cleaned trips (first 10 rows)

Full table: 930,904 rows

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
| Weekday | 0 | 7800 | 9 | 866.7 |
| Weekday | 5 | 5325 | 9 | 591.7 |
| Weekday | 8 | 51097 | 9 | 5677.4 |
| Weekday | 12 | 30189 | 9 | 3354.3 |
| Weekday | 17 | 67453 | 9 | 7494.8 |
| Weekday | 22 | 19426 | 9 | 2158.4 |
| Weekend | 0 | 7752 | 4 | 1938.0 |
| Weekend | 5 | 994 | 4 | 248.5 |
| Weekend | 8 | 6006 | 4 | 1501.5 |
| Weekend | 12 | 16691 | 4 | 4172.8 |
| Weekend | 17 | 21140 | 4 | 5285.0 |
| Weekend | 22 | 9194 | 4 | 2298.5 |

## Table 2 - Member vs Casual hourly share (08, 14, 17 h)

Full table: 96 rows

| day_type | user_type | hour | departures | group_total | hour_share |
| --- | --- | --- | --- | --- | --- |
| Weekday | Member | 8 | 45960 | 551860 | 0.0833 |
| Weekday | Member | 14 | 28349 | 551860 | 0.0514 |
| Weekday | Member | 17 | 56834 | 551860 | 0.103 |
| Weekday | Casual | 8 | 5137 | 113016 | 0.0455 |
| Weekday | Casual | 14 | 6847 | 113016 | 0.0606 |
| Weekday | Casual | 17 | 10619 | 113016 | 0.094 |
| Weekend | Member | 8 | 4834 | 193593 | 0.025 |
| Weekend | Member | 14 | 14399 | 193593 | 0.0744 |
| Weekend | Member | 17 | 15092 | 193593 | 0.078 |
| Weekend | Casual | 8 | 1172 | 72435 | 0.0162 |
| Weekend | Casual | 14 | 5725 | 72435 | 0.079 |
| Weekend | Casual | 17 | 6048 | 72435 | 0.0835 |

## Table 3 - Station net flow (top 3 inflow / outflow per day type)

Full table: 4,732 rows

| day_type | station_id | station_name | lat | lng | avg_daily_arrivals | avg_daily_departures | avg_daily_net_inflow | net_inflow_abs | flow_direction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Weekday | 6450.05 | 8 Ave & W 31 St | 40.750585 | -73.994685 | 461.0 | 166.0 | 295.0 | 295.0 | Net inflow |
| Weekday | 6602.03 | W 41 St & 8 Ave | 40.756405 | -73.990026 | 466.33 | 185.22 | 281.11 | 281.11 | Net inflow |
| Weekday | 6072.06 | Greenwich Ave & 8 Ave | 40.739017 | -74.002638 | 438.89 | 179.56 | 259.33 | 259.33 | Net inflow |
| Weekday | 5980.10 | E 17 St & Broadway | 40.737006 | -73.990134 | 0.0 | 271.33 | -271.33 | 271.33 | Net outflow |
| Weekday | 6331.01 | W 31 St & 7 Ave | 40.749156 | -73.9916 | 0.0 | 242.89 | -242.89 | 242.89 | Net outflow |
| Weekday | 6233.04 | Pier 61 at Chelsea Piers | 40.746872 | -74.00821 | 7.56 | 231.0 | -223.44 | 223.44 | Net outflow |
| Weekend | 5763.03 | Carmine St & 6 Ave | 40.730386 | -74.00215 | 463.5 | 193.75 | 269.75 | 269.75 | Net inflow |
| Weekend | 5379.10 | N 6 St & Bedford Ave | 40.717452 | -73.958509 | 347.0 | 117.75 | 229.25 | 229.25 | Net inflow |
| Weekend | 6072.06 | Greenwich Ave & 8 Ave | 40.739017 | -74.002638 | 396.0 | 172.75 | 223.25 | 223.25 | Net inflow |
| Weekend | 6233.04 | Pier 61 at Chelsea Piers | 40.746872 | -74.00821 | 9.25 | 231.75 | -222.5 | 222.5 | Net outflow |
| Weekend | 5880.02 | W 4 St & 7 Ave S | 40.734011 | -74.002939 | 9.5 | 229.0 | -219.5 | 219.5 | Net outflow |
| Weekend | 5980.10 | E 17 St & Broadway | 40.737006 | -73.990134 | 0.0 | 201.5 | -201.5 | 201.5 | Net outflow |

## Table 4 - Departure hotspots by time window (top 2 per panel)

Full table: 13,409 rows

| day_type | time_window | window_hours | station_id | station_name | lat | lng | total_departures | n_days | avg_daily_departures |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Weekday | Morning | 06:00-09:59 | 6432.09 | Park Ave & E 42 St | 40.751873 | -73.977706 | 566 | 9 | 62.89 |
| Weekday | Morning | 06:00-09:59 | 6756.01 | W 43 St & 10 Ave | 40.760094 | -73.994618 | 552 | 9 | 61.33 |
| Weekday | Midday | 11:00-14:59 | 5980.10 | E 17 St & Broadway | 40.737006 | -73.990134 | 568 | 9 | 63.11 |
| Weekday | Midday | 11:00-14:59 | 6839.15 | Central Park S & Grand Army Plaza | 40.764555 | -73.973473 | 491 | 9 | 54.56 |
| Weekday | Evening | 16:00-19:59 | 5980.10 | E 17 St & Broadway | 40.737006 | -73.990134 | 982 | 9 | 109.11 |
| Weekday | Evening | 16:00-19:59 | 6492.08 | 9 Ave & W 33 St | 40.752568 | -73.996765 | 923 | 9 | 102.56 |
| Weekend | Morning | 06:00-09:59 | 6876.04 | Central Park S & 6 Ave | 40.765909 | -73.976342 | 99 | 4 | 24.75 |
| Weekend | Morning | 06:00-09:59 | 6239.08 | E 31 St & 3 Ave | 40.743943 | -73.979661 | 69 | 4 | 17.25 |
| Weekend | Midday | 11:00-14:59 | 6233.04 | Pier 61 at Chelsea Piers | 40.746872 | -74.00821 | 331 | 4 | 82.75 |
| Weekend | Midday | 11:00-14:59 | 6876.04 | Central Park S & 6 Ave | 40.765909 | -73.976342 | 306 | 4 | 76.5 |
| Weekend | Evening | 16:00-19:59 | 6876.04 | Central Park S & 6 Ave | 40.765909 | -73.976342 | 346 | 4 | 86.5 |
| Weekend | Evening | 16:00-19:59 | 6233.04 | Pier 61 at Chelsea Piers | 40.746872 | -74.00821 | 335 | 4 | 83.75 |
