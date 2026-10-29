#!/usr/bin/env python3
"""Generate the fully offline-bundled HTML with optional configured ONLINE backend.
No external JavaScript/CDN, no service-role key, no connection to NEXUS.
"""
import json, os, re, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=(root/'web/base.html').read_text(encoding='utf-8')
# Immersive Android fixes without modifying the historical design source.
source=source.replace('</style>',(root/'web/native_v07.css').read_text(encoding='utf-8')+'</style>',1)
source=source.replace('Prototipo educativo · Comunidad y beneficios simulados','Comunidad de Lurín · Conecta con tus raíces')
client=(root/'web/live_community.js').read_text(encoding='utf-8')
upgrade=(root/'web/upgrade_v07.js').read_text(encoding='utf-8')
ending=' void initialize();\n})();'
assert ending in client, 'El cliente compartido debe terminar en initialize()'
client=client.replace(ending,'\n'+upgrade+'\n'+ending,1)
# Public mobile keys are explicitly intended for client use; RLS enforces authorization.
# The isolated project is tracked here so GitHub Actions can build without manual secrets.
configfile=root/'config/public-backend.json'
public_cfg=json.loads(configfile.read_text(encoding='utf8')) if configfile.exists() else {}
url=(os.environ.get('LURIN_SUPABASE_URL') or public_cfg.get('supabaseUrl') or '').rstrip('/')
key=(os.environ.get('LURIN_SUPABASE_PUBLISHABLE_KEY') or public_cfg.get('publishableKey') or '')
require_online='--require-online' in sys.argv
if '--demo' in sys.argv:
    if require_online: sys.exit('ERROR: no se permite demo con --require-online')
    url=key=''
is_valid=bool(re.fullmatch(r'https://[a-z0-9-]+\.supabase\.co',url) and re.fullmatch(r'(?:sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+)',key))
if require_online and not is_valid:
    sys.exit('ERROR: faltan LURIN_SUPABASE_URL y LURIN_SUPABASE_PUBLISHABLE_KEY válidos. La APK pública no puede compilarse en modo de demostración.')
if (url or key) and not is_valid:sys.exit('ERROR: configuración Supabase incompleta o inválida.')
configuration={'enabled':is_valid,'supabaseUrl':url if is_valid else '', 'publishableKey':key if is_valid else ''}
# En modo online se habilitan conexiones e imágenes SOLO al proyecto Supabase específico.
if is_valid:
    source=source.replace("img-src data: blob:;", "img-src data: blob: " + url + ";")
    source=source.replace("connect-src 'none';", "connect-src " + url + ";")
# Use a separate inline script to preserve the existing 26-view prototype and all embedded brand images.
injection='<script>window.LURIN_COMMUNITY_CONFIG='+json.dumps(configuration,separators=(',',':'))+';</script>\n<script>'+client.replace('</script','<\\/script')+'</script>\n'
source=source.rstrip()
assert source.endswith('</html>'), 'web/base.html debe cerrar el elemento html'
output=source[:-7]+injection+'</html>'
path=Path(os.environ.get('LURIN_BUNDLE_OUTPUT') or root/'app/src/main/assets/index.html')
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(output,encoding='utf-8')
print('Lurín Comunidad bundle:',path.stat().st_size,'bytes; modo=', 'ONLINE' if is_valid else 'DEMO SIN BACKEND')
