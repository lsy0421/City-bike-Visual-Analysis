# City-bike-Visual-Analysis
A Visual Analysis of Weekday–Weekend Hotspots and Flows in NYC Bike Share
## Group Details

- **Team name:** 13528
- **Group members:**
  - Xi Qiao (`xq816`)
  - Shiyu Liu (`sl13528`)

## Problem Statement and Background

### Research Question

This project examines how Citi Bike usage in New York City differs between weekdays and weekends. We compare where rides concentrate (hotspots) and how riders travel between locations (flows).

Our working hypothesis is that weekday riding is primarily driven by commuting, with sharper peaks, more predictable travel directions, and greater activity around business districts. Weekend riding is expected to be more leisure-oriented, spread throughout the day, and directed toward parks and waterfronts, with a higher share of casual riders.

### Why This Matters

Bike share is an important part of New York City's transportation system, and its usage patterns reflect the city's daily rhythms. Citi Bike trip data lets us examine how those patterns change between weekdays and weekends.

The findings may also inform system operations. If demand shifts to different locations on weekends, bike rebalancing—the movement of bikes from full stations to empty ones—and station planning may need to account for day-of-week differences.

This question is well suited to visualization because it combines time, geography, and network flows, patterns that are difficult to identify in tables alone.

### Context

Citi Bike launched in 2013 and is operated by Lyft under an agreement with the New York City Department of Transportation. The network covers large parts of Manhattan, Brooklyn, Queens, the Bronx, and Jersey City and Hoboken. Data for the New Jersey service area is published in separate files.

Riders are classified as **members** (annual subscribers, who may be more likely to commute) or **casual riders** (single-ride or day-pass users, who may be more likely to be tourists or occasional riders).

The system offers classic bikes and e-bikes. Because bikes are docked at stations, trips between stations affect where bikes are available across the network.

## Dataset

### Citi Bike Trip History Data

This study focuses on trips that started between **September 1 and September 30, 2026**. We will use Citi Bike trip history data for September 2026, available from the [official Citi Bike System Data website](https://citibikenyc.com/system-data).
