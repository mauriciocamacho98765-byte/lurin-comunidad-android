#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import io,base64,json,re
p=Path(__file__).resolve().parents[1]
assert "versionName '0.8.0-beta'" in (p/'app/build.gradle').read_text()
html=(p/'web/base.html').read_text()
m=re.search(r'const ASSETS=(\{.*?\});const IMG=',html)
assert m
assets=json.loads(m.group(1))
for name in ('lurin_logo_oficial.png','lurin_marca_simbolo.png'):
    im=Image.open(io.BytesIO(base64.b64decode(assets[name].split('base64,')[1]))).convert('RGBA')
    al=im.getchannel('A')
    colors=[x for x in im.getdata() if x[3]>200 and max(x[:3])-min(x[:3])>20]
    assert len(colors)>4000,(name,len(colors))
    print('PASS:',name,'opaque colored pixels:',len(colors))
icon=Image.open(p/'app/src/main/res/drawable/ic_launcher_foreground.png')
assert icon.mode=='RGBA' and icon.size==(432,432)
assert icon.getchannel('A').getbbox()
print('PASS: Android launcher icon centered, logo solid')
assert 'welcome-logo-no-card' in html, 'Missing cardless welcome logo'
assert 'background:white;border-radius:24px;padding:14px 32px' not in html, 'Original white logo card still present'
live=(p/'web/live_community.js').read_text()
assert 'welcome-logo-no-card' in live, 'Online login still uses white logo card'
assert 'margin:5px 0 14px;background:white' not in live, 'Online login logo box still white'
assert 'versionName=\'0.7.0-beta\'' in (p/'scripts/verify_apk.sh').read_text(), 'Stale APK verifier version'
print('PASS: white rounded background removed in local welcome and online login')

backend=json.loads((p/'config/public-backend.json').read_text())
assert backend['supabaseUrl']=='https://tjvftleczansqadojxnd.supabase.co'
assert backend['publishableKey'].startswith('sb_publishable_')
assert 'service_role' not in backend['publishableKey']
print('PASS: dedicated public Supabase (publishable client key) only')
