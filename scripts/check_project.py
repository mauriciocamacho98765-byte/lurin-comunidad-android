#!/usr/bin/env python3
"""Offline CI gate: code integrity, no private backend, Java/JS assets, packaging."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess, tempfile, re, xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
web = (root/'app/src/main/assets/index.html').read_text(encoding='utf-8')
java = (root/'app/src/main/java/pe/lurin/comunidad/MainActivity.java').read_text()
gradle = (root/'app/build.gradle').read_text()
manifest = (root/'app/src/main/AndroidManifest.xml').read_text()

assert len(web)>100_000 and web.lstrip().startswith('<!doctype html>')
assert all(c in web for c in ('--indigo:#3a477e','--olive:#a49e27','--gold:#ab7b1d'))
assert 'function render()' in web and 'function handleAction(' in web
assert 'lurinAndroidBack' in web and 'WebViewAssetLoader' in java
assert 'onRenderProcessGone' in java, 'No recovery of WebView renderer crash'
assert 'WindowInsets.Type.systemBars()' in java, 'Missing Android 15 layout fix'
assert 'pe.lurin.comunidad' in gradle and 'pe.lurin.comunidad' in java
assert "versionName '0.7.0-beta'" in gradle
assert 'android:allowBackup="false"' in manifest
assert 'usesCleartextTraffic="false"' in manifest
assert 'android:exported="true"' in manifest
assert 'service_role' not in web and 'sk-proj-' not in web
assert 'appassets.androidplatform.net' in java
assert ("connect-src 'none'" in web or 'connect-src https://' in web)
assert 'LURIN_COMMUNITY_CONFIG' in web and 'lurin_top_raices' in web
assert 'BuildConfig.SUPABASE_HOST' in java, 'Android no usa lista estricta de hosts' 
assert 'storage/v1/object/lurin-fotos' in web, 'Falta carga de fotos a Storage' 
assert "location.href.split('#')[0]+'#historia-'" not in web, 'Sharing a nonworking local origin link'
assert 'No se guardó el progreso local' in web
assert 'toDataURL(\'image/jpeg\',0.72)' in web, 'Image compression missing'
assert 'lurin.app.demo' in web
for dangerous in ('READ_CONTACTS','ACCESS_FINE_LOCATION','ACCESS_BACKGROUND_LOCATION',
                  'READ_SMS','WRITE_EXTERNAL_STORAGE','MANAGE_EXTERNAL_STORAGE'):
    assert dangerous not in manifest, f'Unexpected Android permission: {dangerous}'
ET.fromstring(manifest)

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__(); self.scripts=[]; self.active=False; self.remote=[]
    def handle_starttag(self, tag, attrs):
        att=dict(attrs)
        if tag=='script':
            assert not att.get('src'), 'Remote JavaScript forbidden'
            self.active=True; self.scripts.append('')
        if tag in ('link','iframe','source'):
            if att.get('src','').startswith(('http:','https:')) or att.get('href','').startswith(('http:','https:')):
                self.remote.append((tag,att))
    def handle_data(self, txt):
        if self.active:self.scripts[-1]+=txt
    def handle_endtag(self,tag):
        if tag=='script':self.active=False
parser=Scripts();parser.feed(web)
assert not parser.remote, parser.remote
assert len(parser.scripts)>=1
with tempfile.TemporaryDirectory() as td:
    for i,script in enumerate(parser.scripts):
        tmp=Path(td)/f'inline_{i}.js'; tmp.write_text(script,encoding='utf-8')
        check=subprocess.run(['node','--check',str(tmp)],capture_output=True,text=True)
        assert check.returncode==0, f'JavaScript sintaxis error {i}: {check.stderr}'

routes_match = re.search(r'const views=\{([^}]*)\}', web)
assert routes_match
routes=[part.split(':')[0].strip() for part in routes_match.group(1).split(',')]
assert len(routes)==26, f'Expected 26 screens, found {len(routes)}: {routes}'
assert len(set(routes))==26
assert Path(root/'.github/workflows/build-apk.yml').exists()
assert Path(root/'.github/workflows/public-beta-release.yml').exists()
assert Path(root/'supabase/migrations/20261029000100_lurin_comunidad_independiente.sql').is_file()
assert (root/'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png').is_file()
print('PASS: 26 pantallas base, CSS marca, autenticación y cliente remoto, CSP, Android aislado y scripts válidos')
