#!/usr/bin/env python3
"""Regenerate src/data/florida-ratings-2026.json (the /data/florida-contractor-ratings-2026 snapshot).
Usage: source /workspace/ceo/env.sh && python3 scripts/build-florida-ratings-report.py
Reads every FL listing (paginated, ordered by id: PostgREST caps responses at 1,000 rows)."""
import os, json, datetime, urllib.request, statistics as st, collections as C
U = os.environ['NEXT_PUBLIC_SUPABASE_URL']; K = os.environ['SUPABASE_SERVICE_ROLE_KEY']
def get(path):
    r = urllib.request.Request(U + '/rest/v1/' + path, headers={'apikey': K, 'Authorization': 'Bearer ' + K})
    return json.load(urllib.request.urlopen(r, timeout=60))
cats = {c['id']: c for c in get('categories?select=id,name,slug')}
rows, off = [], 0
while True:
    b = get(f'listings?select=id,city,county,category_id,rating,review_count&state=eq.FL&order=id.asc&offset={off}&limit=1000')
    rows += b; off += 1000
    if len(b) < 1000: break
def stats(rs):
    rated = [r for r in rs if r['rating'] and (r['review_count'] or 0) > 0]
    rt = [float(r['rating']) for r in rated]
    return dict(listings=len(rs), rated=len(rated),
        avgRating=round(st.mean(rt), 2) if rt else None, medianRating=round(st.median(rt), 1) if rt else None,
        pct45=round(100 * sum(1 for x in rt if x >= 4.5) / len(rt), 1) if rt else None,
        pctUnder4=round(100 * sum(1 for x in rt if x < 4.0) / len(rt), 1) if rt else None,
        medianReviews=int(st.median([r['review_count'] for r in rated])) if rated else None,
        totalReviews=sum(r['review_count'] or 0 for r in rs))
out = {'asOf': datetime.date.today().isoformat(), 'state': 'FL', 'overall': stats(rows)}
rt = [float(r['rating']) for r in rows if r['rating'] and (r['review_count'] or 0) > 0]
bands = [('4.8–5.0', 4.8, 5.01), ('4.5–4.7', 4.5, 4.8), ('4.0–4.4', 4.0, 4.5), ('3.0–3.9', 3.0, 4.0), ('Below 3.0', 0, 3.0)]
out['distribution'] = [dict(band=b, count=sum(1 for x in rt if lo <= x < hi)) for b, lo, hi in bands]
assert sum(x['count'] for x in out['distribution']) == len(rt)
by = C.defaultdict(list)
for r in rows: by[r['category_id']].append(r)
out['categories'] = sorted([dict(name=cats[k]['name'], slug=cats[k]['slug'], **stats(v),
    topCity=C.Counter(r['city'] for r in v).most_common(1)[0][0]) for k, v in by.items()], key=lambda x: -x['listings'])
by = C.defaultdict(list)
for r in rows: by[r['city']].append(r)
out['cities'] = [dict(city=k, **stats(v), topCategory=cats[C.Counter(r['category_id'] for r in v).most_common(1)[0][0]]['name'])
    for k, v in sorted(by.items(), key=lambda kv: -len(kv[1]))[:30]]
out['cityCount'] = len(by)
by = C.defaultdict(list)
for r in rows:
    if r['county']: by[r['county']].append(r)
out['counties'] = sorted([dict(county=k, **stats(v)) for k, v in by.items()], key=lambda x: -x['listings'])
out['countyCount'] = len(by)
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'florida-ratings-2026.json')
json.dump(out, open(p, 'w'), indent=1, ensure_ascii=False)
print('listings', out['overall']['listings'], 'rated', out['overall']['rated'], 'asOf', out['asOf'])
