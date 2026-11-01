#!/usr/bin/env python3
"""Regenerate src/data/florida-ratings-2026-by-category.json (the /data/florida-contractor-ratings-2026/<category> pages).
Usage: source /workspace/ceo/env.sh && python3 scripts/build-category-ratings-report.py
Same snapshot rules as build-florida-ratings-report.py: FL listings only, paginated + ordered by id, QA rows (zz-hap-test) excluded.
No per-business "top" lists: category data still has miscategorized rows (stores, parks, car washes), so only aggregates are published."""
import os, re, json, datetime, urllib.request, statistics as st, collections as C
U = os.environ['NEXT_PUBLIC_SUPABASE_URL']; K = os.environ['SUPABASE_SERVICE_ROLE_KEY']
MIN_CITY = 3  # same as MIN_INDEXABLE_CITY_LISTINGS: only link city pages Google may index
def get(path):
    r = urllib.request.Request(U + '/rest/v1/' + path, headers={'apikey': K, 'Authorization': 'Bearer ' + K})
    return json.load(urllib.request.urlopen(r, timeout=60))
def city_slug(c): return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', c.lower()))
cats = {c['id']: c for c in get('categories?select=id,name,slug')}
rows, off = [], 0
while True:
    b = get(f'listings?select=id,name,slug,city,county,category_id,rating,review_count&state=eq.FL&order=id.asc&offset={off}&limit=1000')
    rows += b; off += 1000
    if len(b) < 1000: break
rows = [r for r in rows if not (r['slug'] or '').startswith('zz-hap-test')]
def rated(rs): return [r for r in rs if r['rating'] and (r['review_count'] or 0) > 0]
def stats(rs):
    rd = rated(rs); rt = [float(r['rating']) for r in rd]
    return dict(listings=len(rs), rated=len(rd),
        avgRating=round(st.mean(rt), 2) if rt else None, medianRating=round(st.median(rt), 1) if rt else None,
        pct45=round(100 * sum(1 for x in rt if x >= 4.5) / len(rt), 1) if rt else None,
        pctUnder4=round(100 * sum(1 for x in rt if x < 4.0) / len(rt), 1) if rt else None,
        medianReviews=int(st.median([r['review_count'] for r in rd])) if rd else None,
        totalReviews=sum(r['review_count'] or 0 for r in rs))
bands = [('4.8–5.0', 4.8, 5.01), ('4.5–4.7', 4.5, 4.8), ('4.0–4.4', 4.0, 4.5), ('3.0–3.9', 3.0, 4.0), ('Below 3.0', 0, 3.0)]
out = {'asOf': datetime.date.today().isoformat(), 'state': 'FL', 'categories': []}
by = C.defaultdict(list)
for r in rows: by[r['category_id']].append(r)
for cid, rs in by.items():
    if cid not in cats: continue
    c = cats[cid]; s = stats(rs)
    rt = [float(r['rating']) for r in rated(rs)]
    dist = [dict(band=b, count=sum(1 for x in rt if lo <= x < hi)) for b, lo, hi in bands]
    assert sum(d['count'] for d in dist) == len(rt)
    bc = C.defaultdict(list)
    for r in rs:
        if (r['city'] or '').strip(): bc[city_slug(r['city'].strip())].append(r)
    cities = []
    for slug, v in sorted(bc.items(), key=lambda kv: -len(kv[1]))[:15]:
        name = C.Counter(r['city'].strip() for r in v).most_common(1)[0][0]
        cities.append(dict(city=name, href=f"/services/{c['slug']}/{slug}" if len(v) >= MIN_CITY else None, **stats(v)))
    bco = C.defaultdict(list)
    for r in rs:
        if r['county']: bco[r['county']].append(r)
    counties = [dict(county=k, **stats(v)) for k, v in sorted(bco.items(), key=lambda kv: -len(kv[1]))[:10]]
    out['categories'].append(dict(name=c['name'], slug=c['slug'], **s, distribution=dist, cityCount=len(bc), cities=cities,
                                  countyCount=len(bco), counties=counties))
out['categories'].sort(key=lambda x: -x['listings'])
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'florida-ratings-2026-by-category.json')
json.dump(out, open(p, 'w'), indent=1, ensure_ascii=False)
print('categories', len(out['categories']), 'listings', sum(c['listings'] for c in out['categories']), 'asOf', out['asOf'])
