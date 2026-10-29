#!/usr/bin/env python3
"""Static security & release gates. Cannot replace RLS tests on a live Supabase project."""
import subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
basic=(root/'supabase/migrations/20261029000100_lurin_comunidad_independiente.sql').read_text()
live=(root/'supabase/migrations/20261029000200_shared_community.sql').read_text()
client=(root/'web/live_community.js').read_text()
java=(root/'app/src/main/java/pe/lurin/comunidad/MainActivity.java').read_text()
assert 'enable row level security' in basic.lower()
assert 'author_id=(select auth.uid())' in basic.lower() or 'author_id = (SELECT auth.uid())' in live
assert 'lurin_post_image_ownership' in live
assert "(storage.foldername(name))[1] = (SELECT auth.uid())::text" in live
assert 'REVOKE ALL ON FUNCTION public.lurin_top_raices() FROM PUBLIC,anon' in live
assert 'tr_lurin_post_points' in live and 'tr_lurin_comment_points' in live
assert 'lurin_limit_posting' in live and 'lurin_limit_comments' in live
assert 'GRANT EXECUTE ON FUNCTION public.lurin_my_points() TO authenticated' in live
assert 'INSERT INTO public.lurin_point_ledger' in live
assert 'service_role' not in client and 'sk-proj-' not in client
assert 'BuildConfig.SUPABASE_HOST.equalsIgnoreCase(host)' in java
assert 'cleartextTrafficPermitted="true"' not in java
# A publishable key is intentionally stored in this stand-alone OPEN-SOURCE app.
# Builds with the trusted Lurín-only backend succeed; unsafe overrides fail closed.
result=subprocess.run(['python3','scripts/bundle_live.py','--require-online'],cwd=root,env={'PATH':'/usr/bin:/bin'},capture_output=True,text=True)
assert result.returncode == 0, 'Backend dedicado no disponible: ' + result.stdout + result.stderr
with (root/'config/public-backend.json').open(encoding='utf8') as ff:
    import json
    cfg=json.load(ff)
assert cfg['supabaseUrl']=='https://tjvftleczansqadojxnd.supabase.co'
assert cfg['publishableKey'].startswith('sb_publishable_')
unsafe={'PATH':'/usr/bin:/bin','LURIN_SUPABASE_URL':'http://unsafe.example','LURIN_SUPABASE_PUBLISHABLE_KEY':'service_role_not_allowed'}
result=subprocess.run(['python3','scripts/bundle_live.py','--require-online'],cwd=root,env=unsafe,capture_output=True,text=True)
assert result.returncode != 0, 'Se aceptó un backend falso o credencial peligrosa'
print('PASS: RLS, límites, puntaje servidor, backend dedicado y credenciales inseguras rechazadas')
