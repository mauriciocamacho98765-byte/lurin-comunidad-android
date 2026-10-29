#!/usr/bin/env python3
"""Smoke real sin revelar tokens: visitante + cuenta con usuario + inicio de sesión.
Crea cuentas QA sin perfil público; solo se ejecuta en GitHub Actions sobre Lurín.
"""
import os,json,secrets,urllib.request,urllib.error
from pathlib import Path
# La misma configuración pública que utiliza la APK. GitHub Actions no necesita
# variables duplicadas para las pruebas reales de autenticación.
config_path=Path(__file__).resolve().parents[1]/'config/public-backend.json'
config=json.loads(config_path.read_text(encoding='utf-8'))
url=(os.environ.get('LURIN_SUPABASE_URL') or config.get('supabaseUrl') or '').rstrip('/')
key=os.environ.get('LURIN_SUPABASE_PUBLISHABLE_KEY') or config.get('publishableKey') or ''
if url!='https://tjvftleczansqadojxnd.supabase.co':
    raise SystemExit('Smoke test: se rechazó backend que no pertenece a Lurín')
if not key.startswith('sb_publishable_'):
    raise SystemExit('Smoke test: falta la clave pública de Lurín')
def req(path,payload=None,token=None):
    body=json.dumps(payload).encode() if payload is not None else None
    h={'apikey':key,'Content-Type':'application/json'}
    if token:h['Authorization']='Bearer '+token
    q=urllib.request.Request(url+path,data=body,headers=h,method='POST' if payload is not None else 'GET')
    try:
        with urllib.request.urlopen(q,timeout=25) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        message=e.read(250).decode('utf-8','replace')
        raise RuntimeError('Fallo de autenticación HTTP '+str(e.code)+': '+message) from None
guest=req('/functions/v1/lurin-identity',{'action':'guest','displayName':'Visita de prueba QA'})
assert guest.get('access_token') and guest.get('user',{}).get('id')
me=req('/auth/v1/user',token=guest['access_token'])
assert me.get('id')==guest['user']['id']
name='qa'+secrets.token_hex(6)
pwd='QAa6'+secrets.token_urlsafe(18)
signed=req('/functions/v1/lurin-identity',{'action':'register','username':name,'password':pwd,'displayName':'Prueba comunitaria'})
assert signed.get('user',{}).get('id')
returned=req('/functions/v1/lurin-identity',{'action':'login','username':name,'password':pwd})
assert returned.get('user',{}).get('id')==signed['user']['id']
print('PASS: Supabase real acepta visitantes y username+password sin correo; sesiones verificadas')
