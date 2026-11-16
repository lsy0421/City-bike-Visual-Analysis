#!/usr/bin/env python3
"""Build the four agreed Citi Bike views from the complete official monthly ZIP."""
from pathlib import Path
import sys, os, json, calendar, zipfile
from argparse import ArgumentParser
from collections import Counter, defaultdict

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.deps'))
os.environ.setdefault('MPLCONFIGDIR', str(ROOT / '.matplotlib'))
import numpy as np
import pandas as pd
import shapely
from shapely.geometry import shape
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.ticker import PercentFormatter, StrMethodFormatter

RAW, OUT, FIG = ROOT/'data/raw', ROOT/'data/processed', ROOT/'figures'
OUT.mkdir(parents=True, exist_ok=True)
FIG.mkdir(parents=True, exist_ok=True)
MONTH = pd.Timestamp('2026-09-01')
STOP = pd.Timestamp('2026-10-01')
HOLIDAY = pd.Timestamp('2026-09-07')
DAYS = {'weekday': 21, 'weekend': 8}
PERIODS = {'Morning (07–10)': (7,10), 'Midday (11–14)': (11,14), 'Evening (16–19)': (16,19)}
BLUE, ORANGE, INK, MUTED = '#176B91', '#C55C2B', '#172B3A', '#556574'
DAYLABEL = {'weekday':'Ordinary weekday', 'weekend':'Weekend'}
COLORS = {'weekday': BLUE, 'weekend': ORANGE}
FIELDS = ['ride_id','started_at','ended_at','start_station_id','end_station_id',
          'start_station_name','end_station_name','start_lat','start_lng',
          'end_lat','end_lng','member_casual']

def day_type(times):
    return pd.Series(np.where(times.dt.normalize().eq(HOLIDAY),'holiday',
                    np.where(times.dt.dayofweek.ge(5),'weekend','weekday')),index=times.index)

def aggregate():
    geo = json.loads((RAW/'boroughs.geojson').read_text())
    manhattan = next(f for f in geo['features'] if f['properties']['boroname']=='Manhattan')
    polygon = shape(manhattan['geometry'])
    shapely.prepare(polygon)
    audit = Counter()
    seen = set()
    hourly, member, departures, arrivals, hotspots, stationhour = [Counter() for _ in range(6)]
    stations = defaultdict(lambda: {'lat_sum':0.,'lon_sum':0.,'n':0,'name':''})
    valid_dates = Counter()
    file_details = []

    def keep(df, mask, reason):
        mask = mask.fillna(False)
        audit[reason] += int((~mask).sum())
        return df.loc[mask].copy()

    def add_counts(counter, frame, columns):
        if not len(frame): return
        grouped = frame.groupby(columns, observed=True, dropna=False).size()
        for key, value in grouped.items():
            counter[key if isinstance(key,tuple) else (key,)] += int(value)

    with zipfile.ZipFile(RAW/'202609-citibike-tripdata.zip') as archive:
        files=sorted(n for n in archive.namelist() if n.lower().endswith('.csv') and not n.startswith('__MACOSX'))
        for filename in files:
            rows = 0
            with archive.open(filename) as stream:
                for df in pd.read_csv(stream, usecols=FIELDS, dtype='string', chunksize=200_000):
                    audit['raw_rows'] += len(df); rows += len(df)
                    df=keep(df,df.ride_id.notna() & df.ride_id.str.strip().ne(''),'missing_ride_id')
                    ids=df.ride_id
                    unique=~ids.duplicated() & ~ids.isin(seen)
                    seen.update(ids.tolist())
                    df=keep(df,unique,'duplicate_ride_id')
                    for col in ['started_at','ended_at']:
                        df[col]=pd.to_datetime(df[col],format='mixed',errors='coerce')
                    df=keep(df,df.started_at.notna() & df.ended_at.notna() & df.ended_at.gt(df.started_at),'invalid_time')
                    df=keep(df,df.started_at.ge(MONTH)&df.started_at.lt(STOP),'departure_outside_month')
                    for col in ['start_station_id','end_station_id']:
                        df[col]=df[col].str.strip()
                    df=keep(df,df.start_station_id.notna() & df.end_station_id.notna() & df.start_station_id.ne('') & df.end_station_id.ne(''),'missing_station_id')
                    coords=['start_lat','start_lng','end_lat','end_lng']
                    for col in coords:
                        df[col]=pd.to_numeric(df[col],errors='coerce').astype(float)
                    valid=df[coords].notna().all(axis=1)
                    valid &= df.start_lat.between(-90,90)&df.end_lat.between(-90,90)&df.start_lng.between(-180,180)&df.end_lng.between(-180,180)
                    df=keep(df,valid,'invalid_or_missing_coordinates')
                    inside=shapely.intersects_xy(polygon,df.start_lng.to_numpy(),df.start_lat.to_numpy()) & shapely.intersects_xy(polygon,df.end_lng.to_numpy(),df.end_lat.to_numpy())
                    df=keep(df,pd.Series(inside,index=df.index),'not_both_endpoints_in_manhattan')
                    audit['eligible_trips'] += len(df)
                    if not len(df): continue
                    df['day_type']=day_type(df.started_at)
                    df['hour']=df.started_at.dt.hour
                    audit['holiday_departures']+=int(df.day_type.eq('holiday').sum())
                    audit['unknown_membership']+=int((~df.member_casual.isin(['member','casual'])).sum())
                    audit['end_outside_month']+=int((~df.ended_at.ge(MONTH)|~df.ended_at.lt(STOP)).sum())
                    for date,count in df.groupby(df.started_at.dt.strftime('%Y-%m-%d')).size().items():valid_dates[date]+=int(count)
                    base=df.loc[df.day_type.isin(DAYS)].copy()
                    add_counts(hourly,base,['day_type','hour'])
                    add_counts(member,base.loc[base.member_casual.isin(['member','casual'])],['day_type','member_casual','hour'])
                    add_counts(departures,base,['day_type','start_station_id'])
                    add_counts(stationhour,base,['day_type','start_station_id','hour'])
                    arrivals_df=df.loc[df.ended_at.ge(MONTH)&df.ended_at.lt(STOP)].copy()
                    arrivals_df['arrival_day_type']=day_type(arrivals_df.ended_at)
                    arrivals_df=arrivals_df.loc[arrivals_df.arrival_day_type.isin(DAYS)]
                    add_counts(arrivals,arrivals_df,['arrival_day_type','end_station_id'])
                    for label,(lo,hi) in PERIODS.items():
                        window=base.loc[base.hour.ge(lo)&base.hour.lt(hi)].copy()
                        window['period']=label
                        add_counts(hotspots,window,['day_type','period','start_station_id'])
                    for prefix in ['start','end']:
                        g=df.groupby(f'{prefix}_station_id',observed=True).agg(lat_sum=(f'{prefix}_lat','sum'),lon_sum=(f'{prefix}_lng','sum'),n=(f'{prefix}_lat','size'),name=(f'{prefix}_station_name','first'))
                        for sid,row in g.iterrows():
                            s=stations[sid];s['lat_sum']+=float(row.lat_sum);s['lon_sum']+=float(row.lon_sum);s['n']+=int(row.n)
                            if not s['name'] and pd.notna(row['name']):s['name']=str(row['name'])
                    print(f'{filename}: {rows:,} rows read; {audit["eligible_trips"]:,} eligible so far',flush=True)
            file_details.append({'file':filename,'rows':rows})

    station_rows=[{'station_id':sid,'station_name':s['name'] or sid,'lat':s['lat_sum']/s['n'],'lon':s['lon_sum']/s['n'],'coordinate_observations':s['n']} for sid,s in sorted(stations.items())]
    meta=pd.DataFrame(station_rows)
    meta.to_csv(OUT/'stations.csv',index=False)
    sids=meta.station_id.tolist()
    q1=pd.DataFrame([{'day_type':day,'hour':hour,'trip_count':hourly[(day,hour)],'denominator_days':days,'avg_departures_per_day':hourly[(day,hour)]/days} for day,days in DAYS.items() for hour in range(24)])
    q2=pd.DataFrame([{'day_type':day,'member_casual':kind,'hour':hour,'trip_count':member[(day,kind,hour)],'denominator_days':days} for day,days in DAYS.items() for kind in ['member','casual'] for hour in range(24)])
    q2['group_total']=q2.groupby(['day_type','member_casual']).trip_count.transform('sum')
    q2['hourly_share']=q2.trip_count.div(q2.group_total.replace(0,np.nan))
    q2['avg_departures_per_day']=q2.trip_count/q2.denominator_days
    q3=pd.DataFrame([{'day_type':day,'station_id':sid,'departure_count':departures[(day,sid)],'arrival_count':arrivals[(day,sid)],'denominator_days':days} for day,days in DAYS.items() for sid in sids]).merge(meta,on='station_id',validate='many_to_one')
    q3['avg_departures_per_day']=q3.departure_count/q3.denominator_days
    q3['avg_arrivals_per_day']=q3.arrival_count/q3.denominator_days
    q3['net_inflow_per_day']=q3.avg_arrivals_per_day-q3.avg_departures_per_day
    q4=pd.DataFrame([{'day_type':day,'period':period,'station_id':sid,'trip_count':hotspots[(day,period,sid)],'denominator_days':days,'avg_departures_per_day':hotspots[(day,period,sid)]/days} for day,days in DAYS.items() for period in PERIODS for sid in sids]).merge(meta,on='station_id',validate='many_to_one')
    qhour=pd.DataFrame([{'day_type':day,'station_id':sid,'hour':hour,'trip_count':stationhour[(day,sid,hour)],'avg_departures_per_day':stationhour[(day,sid,hour)]/days} for day,days in DAYS.items() for sid in sids for hour in range(24)])
    for name,table in [('q1_hourly',q1),('q2_membership',q2),('q3_station_netflow',q3),('q4_hotspots',q4),('station_hourly_departures',qhour)]:
        table.to_csv(OUT/f'{name}.csv',index=False,float_format='%.8f')
        if name=='q1_hourly':
            sample=table.loc[table.hour.isin([0,7,8,12,17,23])]
        elif name=='q2_membership':
            sample=table.loc[table.hour.isin([8,12,17])]
        elif name=='q3_station_netflow':
            sample=pd.concat([g.sort_values('net_inflow_per_day').iloc[np.r_[0:3,-3:0]] for _,g in table.groupby('day_type')])
        elif name=='q4_hotspots':
            sample=table.sort_values('avg_departures_per_day',ascending=False).groupby(['day_type','period'],sort=False).head(2)
        else:
            sample=table.groupby('day_type',sort=False).head(6)
        sample.to_csv(OUT/f'{name}_sample.csv',index=False,float_format='%.4f')
    pd.DataFrame([{'date':d,'eligible_departures':valid_dates[d]} for d in pd.date_range(MONTH,STOP-pd.Timedelta(days=1)).strftime('%Y-%m-%d')]).to_csv(OUT/'daily_coverage.csv',index=False)
    audit.update({'q1_departures':int(q1.trip_count.sum()),'q2_known_membership_departures':int(q2.trip_count.sum()),'q3_arrivals':int(q3.arrival_count.sum()),'station_count':len(meta)})
    audit_data={'counts':dict(audit),'files':file_details,'denominator_days':DAYS,'rules':{'scope':'Both endpoints intersect official Manhattan borough boundary','timezone':'Timestamps interpreted as NYC local wall time, without conversion from UTC','holiday':'2026-09-07 excluded from ordinary-weekday comparisons','membership':'Unknown categories retained for total/space views, excluded only from Q2','arrivals':'End-time date determines arrival day type; only September-start cohort available; incoming August trips are not present','coordinates':'Station locations are endpoint-frequency-weighted means of eligible endpoint coordinates','duration':'Positive duration required; no arbitrary upper-duration filter'}}
    (OUT/'audit.json').write_text(json.dumps(audit_data,indent=2))
    checks={'all_5_monthly_csvs_read':len(files)==5,'q1_48_rows':len(q1)==48,'q2_96_rows':len(q2)==96,'q2_shares_sum_to_one':bool(np.allclose(q2.groupby(['day_type','member_casual']).hourly_share.sum(),1)),'q1_counts_match_station_departures':int(q1.trip_count.sum())==int(q3.departure_count.sum()),'all_30_dates_have_eligible_rides':all(valid_dates[d]>0 for d in pd.date_range(MONTH,STOP-pd.Timedelta(days=1)).strftime('%Y-%m-%d')),'q4_windows_disjoint':len(set(h for lo,hi in PERIODS.values() for h in range(lo,hi)))==sum(hi-lo for lo,hi in PERIODS.values()),'netflow_definition':bool(np.allclose(q3.net_inflow_per_day,q3.avg_arrivals_per_day-q3.avg_departures_per_day))}
    checks['sequential_exclusions_reconcile']=audit['raw_rows']==audit['eligible_trips']+sum(audit[k] for k in ['missing_ride_id','duplicate_ride_id','invalid_time','departure_outside_month','missing_station_id','invalid_or_missing_coordinates','not_both_endpoints_in_manhattan'])
    (OUT/'validation.json').write_text(json.dumps(checks,indent=2))
    if not all(checks.values()):raise AssertionError(checks)
    print(json.dumps(audit_data,indent=2),flush=True)

def project(lon,lat):
    return np.asarray(lon),np.degrees(np.arcsinh(np.tan(np.radians(lat))))

def plot_all():
    plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.titlesize':13,'axes.labelsize':11,'figure.facecolor':'white','axes.facecolor':'white','text.color':INK,'axes.labelcolor':INK,'xtick.color':MUTED,'ytick.color':MUTED,'axes.edgecolor':'#CAD2D8','axes.spines.top':False,'axes.spines.right':False,'svg.fonttype':'none'})
    q1=pd.read_csv(OUT/'q1_hourly.csv');q2=pd.read_csv(OUT/'q2_membership.csv');q3=pd.read_csv(OUT/'q3_station_netflow.csv',dtype={'station_id':str});q4=pd.read_csv(OUT/'q4_hotspots.csv',dtype={'station_id':str})
    audit=json.loads((OUT/'audit.json').read_text())
    geo=json.loads((RAW/'boroughs.geojson').read_text())
    def finish(fig,name):
        fig.savefig(FIG/f'{name}.png',dpi=190,facecolor='white')
        fig.savefig(FIG/f'{name}.svg',facecolor='white')
        plt.close(fig)
    def chart_axes(ax,percent=False):
        ax.set_xlim(0,23);ax.set_xticks([0,4,8,12,16,20,23]);ax.set_xlabel('Departure hour (NYC local time)')
        ax.set_ylim(bottom=0);ax.grid(axis='y',alpha=.18);ax.set_axisbelow(True)
        if percent:ax.yaxis.set_major_formatter(PercentFormatter(1))
        else:ax.yaxis.set_major_formatter(StrMethodFormatter('{x:,.0f}'))
    def header(fig,title,subtitle):
        fig.suptitle(title,x=.075,y=.975,ha='left',fontsize=20,fontweight='bold')
        fig.text(.075,.921,subtitle,ha='left',fontsize=11,color=MUTED)
    caption='Manhattan → Manhattan trips · September 2026 · Ordinary weekdays: 21 days; weekends: 8 days · Labor Day excluded'
    fig,ax=plt.subplots(figsize=(11.5,6.5));fig.subplots_adjust(left=.10,right=.96,top=.81,bottom=.22)
    header(fig,'Q1  When do rides start?','Average hourly departures: ordinary weekdays versus weekends')
    for day in DAYS:
        d=q1.loc[q1.day_type.eq(day)]
        ax.plot(d.hour,d.avg_departures_per_day,color=COLORS[day],linestyle='-' if day=='weekday' else '--',linewidth=2.5,label=DAYLABEL[day])
    chart_axes(ax);ax.set_ylabel('Average departures (trips/day)');ax.legend(frameon=False,loc='upper left')
    fig.text(.075,.105,caption,fontsize=9,color=MUTED)
    fig.text(.075,.06,'Interaction plan: hover an hour to compare both values; click a legend entry to show or hide that series.',fontsize=10,color=INK)
    finish(fig,'q1-hourly-comparison')
    fig,axes=plt.subplots(1,2,figsize=(12,6.4),sharex=True,sharey=True);fig.subplots_adjust(left=.085,right=.97,top=.79,bottom=.24,wspace=.15)
    header(fig,'Q2  Do rider groups follow different schedules?','Hourly share within each rider group and day type; each curve sums to 100%')
    for ax,kind in zip(axes,['member','casual']):
        for day in DAYS:
            d=q2.loc[q2.day_type.eq(day)&q2.member_casual.eq(kind)]
            ax.plot(d.hour,d.hourly_share,color=COLORS[day],linestyle='-' if day=='weekday' else '--',linewidth=2.3,label=DAYLABEL[day])
        ax.set_title('Members' if kind=='member' else 'Casual riders',loc='left',pad=13);chart_axes(ax,True)
    axes[0].set_ylabel('Share of group departures (%)');axes[0].legend(frameon=False,loc='upper left',fontsize=9)
    fig.text(.075,.115,caption,fontsize=9,color=MUTED)
    fig.text(.075,.065,'Interaction plan: hover an hour to reveal its percentage and trip count. Both panels keep the same scale.',fontsize=10)
    finish(fig,'q2-membership-timing')
    man=next(f for f in geo['features'] if f['properties']['boroname']=='Manhattan')
    xmin,ymin,xmax,ymax=shape(man['geometry']).bounds
    _,yy=project([xmin,xmax],[ymin,ymax]);bounds=(xmin-.012,xmax+.012,yy[0]-.008,yy[1]+.008)
    def basemap(ax):
        for feature in geo['features']:
            geom=feature['geometry'];polys=geom['coordinates'] if geom['type']=='MultiPolygon' else [geom['coordinates']]
            for polygon in polys:
                ring=np.array(polygon[0]);x,y=project(ring[:,0],ring[:,1]);ax.fill(x,y,color='#EFF1F2',edgecolor='#C5CDD2',linewidth=.35,zorder=0)
                for hole in polygon[1:]:
                    ring=np.array(hole);x,y=project(ring[:,0],ring[:,1]);ax.fill(x,y,color='white',zorder=0)
        ax.set_xlim(bounds[:2]);ax.set_ylim(bounds[2:]);ax.set_aspect('equal');ax.axis('off')
    maxnet=float(q3.net_inflow_per_day.abs().max())
    scale=110/maxnet
    fig,axes=plt.subplots(1,2,figsize=(10.5,10.2));fig.subplots_adjust(left=.05,right=.95,top=.83,bottom=.21,wspace=.08)
    header(fig,'Q3  Which stations have net inflow?','Daily net inflow = recorded arrivals − departures; arrival dates use trip end times')
    fig.text(.075,.885,'Manhattan-internal trips · September 2026 · Ordinary weekdays: 21 days; weekends: 8 days',fontsize=9.5,color=MUTED)
    for ax,day in zip(axes,DAYS):
        basemap(ax);ax.set_title(DAYLABEL[day],pad=12,loc='left')
        d=q3.loc[q3.day_type.eq(day)].sort_values('net_inflow_per_day',key=abs)
        x,y=project(d.lon,d.lat)
        for positive,marker,color,correction in [(True,'o',BLUE,1),(False,'v',ORANGE,np.pi/2)]:
            sub=d.loc[d.net_inflow_per_day.ge(0).eq(positive)]
            x,y=project(sub.lon,sub.lat)
            ax.scatter(x,y,s=sub.net_inflow_per_day.abs()*scale*correction,c=color,marker=marker,alpha=.68,linewidths=0,zorder=2)
    keys=[Line2D([],[],marker='o',color='none',markerfacecolor=BLUE,markersize=8,label='+ Net inflow'),Line2D([],[],marker='v',color='none',markerfacecolor=ORANGE,markersize=8,label='− Net outflow')]
    fig.legend(handles=keys,frameon=False,loc='lower left',bbox_to_anchor=(.075,.145),ncol=2)
    sizevals=[round(maxnet*f,0) for f in [.25,.5,1]]
    sizehandles=[plt.scatter([],[],s=v*scale,c='#8C989F',linewidths=0,label=f'{v:,.0f}') for v in sizevals]
    fig.legend(handles=sizehandles,title='Symbol area: |net trips/day|',frameon=False,loc='lower right',bbox_to_anchor=(.94,.13),ncol=3)
    fig.text(.075,.09,'Same map extent and symbol-area scale in both panels. Trip flow is not station inventory.',fontsize=10)
    fig.text(.075,.055,'Interaction plan: select a station on either map to highlight it in both and display arrivals, departures and net flow.',fontsize=9.5)
    fig.text(.075,.02,'September-start cohort: arrivals from August departures are not included. Labor Day events excluded.',fontsize=9,color=MUTED)
    finish(fig,'q3-station-netflow')
    maxhot=float(q4.avg_departures_per_day.max());hot_scale=100/maxhot
    fig,axes=plt.subplots(2,3,figsize=(12,12.8));fig.subplots_adjust(left=.075,right=.97,top=.85,bottom=.13,wspace=.06,hspace=.08)
    header(fig,'Q4  Where do departure hotspots move?','Station-level departures across three equal-length windows; all six maps share one size scale')
    fig.text(.075,.89,'Manhattan-internal trips · September 2026 · Ordinary weekdays: 21 days; weekends: 8 days · Labor Day excluded',fontsize=9.5,color=MUTED)
    for row,day in enumerate(DAYS):
        for col,period in enumerate(PERIODS):
            ax=axes[row,col];basemap(ax)
            if row==0:ax.set_title(period,pad=10)
            d=q4.loc[q4.day_type.eq(day)&q4.period.eq(period)].sort_values('avg_departures_per_day')
            x,y=project(d.lon,d.lat)
            ax.scatter(x,y,s=d.avg_departures_per_day*hot_scale,color=BLUE,alpha=.5,linewidths=0)
            if col==0:ax.text(-.09,.5,DAYLABEL[day],transform=ax.transAxes,rotation=90,va='center',ha='center',fontsize=12,color=INK)
    vals=[round(maxhot*f,0) for f in [.25,.5,1]]
    handles=[plt.scatter([],[],s=v*hot_scale,c=BLUE,alpha=.65,linewidths=0,label=f'{v:,.0f}') for v in vals]
    fig.legend(handles=handles,title='Circle area: average departures per day in the 3-hour window',frameon=False,ncol=3,loc='lower center',bbox_to_anchor=(.52,.06))
    fig.text(.075,.04,'Windows include their start time and exclude their end time. Each panel includes all eligible stations, including zeros.',fontsize=9,color=MUTED)
    fig.text(.075,.015,'Interaction plan: hover a station for its name and value; keep geographic extent and symbol scale fixed.',fontsize=9.5)
    finish(fig,'q4-hotspot-shifts')
    print('Saved 4 PNG figures and 4 editable SVG figures.',flush=True)

if __name__=='__main__':
    parser = ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--data-only', action='store_true', help='Rebuild the tables and audit files.')
    modes.add_argument('--plots-only', action='store_true', help='Draw static previews from existing tables.')
    args = parser.parse_args()
    if not args.plots_only:
        aggregate()
    if not args.data_only:
        plot_all()
