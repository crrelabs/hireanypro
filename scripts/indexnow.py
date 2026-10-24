#!/usr/bin/env python3
"""Submit every URL in the live sitemap index to IndexNow (Bing, Yandex, Seznam, Naver...).
Usage: python3 scripts/indexnow.py [--only cities|pages|listings] [--dry-run]
The key file is public/1f2726c66e4719b314f6a73ed358b165.txt (public by design; it just proves we own the host)."""
import re, sys, json, urllib.request
KEY = '1f2726c66e4719b314f6a73ed358b165'
HOST = 'hireanypro.com'
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'HAP-IndexNow/1.0'}), timeout=60).read().decode()
only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
subs = re.findall(r'<loc>(.*?)</loc>', get(f'https://{HOST}/sitemap.xml'))
urls = []
for s in subs:
    if only and only not in s: continue
    urls += re.findall(r'<loc>(.*?)</loc>', get(s))
print(f'{len(urls)} URLs from {len(subs)} sitemaps')
if '--dry-run' in sys.argv: sys.exit()
for i in range(0, len(urls), 10000):
    body = json.dumps({'host': HOST, 'key': KEY, 'keyLocation': f'https://{HOST}/{KEY}.txt', 'urlList': urls[i:i + 10000]}).encode()
    req = urllib.request.Request('https://api.indexnow.org/indexnow', data=body, method='POST', headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r: print('batch', i // 10000, r.status)
    except urllib.error.HTTPError as e: print('batch', i // 10000, e.code, e.read()[:200])
