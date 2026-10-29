#!/usr/bin/env python3
"""Two independent Android-sized browser sessions against ONE mocked backend.
Tests the app UI and REST client; cannot certify a real hosted Supabase or an APK.
"""
import os, json, uuid, copy, tempfile
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
app=Path(tempfile.gettempdir())/'lurin_two_phone_mock_bundle.html'
url='https://lurin-test.supabase.co'
# Requires backend ON build, and no production secrets.
import subprocess
cfg=dict(os.environ,LURIN_SUPABASE_URL=url,LURIN_SUPABASE_PUBLISHABLE_KEY='sb_publishable_qa_fake0123456789',LURIN_BUNDLE_OUTPUT=str(app))
result=subprocess.run(['python3','scripts/bundle_live.py','--require-online'],cwd=root,env=cfg,capture_output=True,text=True)
assert result.returncode==0,result.stderr+result.stdout
html=app.read_text()
assert 'connect-src https://lurin-test.supabase.co;' in html
assert 'img-src data: blob: https://lurin-test.supabase.co;' in html

users={
    'ana@lurin.test': {'id':'00000000-0000-4000-8000-000000000001','email':'ana@lurin.test','user_metadata':{'display_name':'Ana del Valle'}},
    'luis@lurin.test': {'id':'00000000-0000-4000-8000-000000000002','email':'luis@lurin.test','user_metadata':{'display_name':'Luis de Lurín'}},
}
DB={k:[] for k in ['lurin_profiles','lurin_posts','lurin_comments','lurin_likes','lurin_follows','lurin_point_ledger','lurin_room_members','lurin_messages','lurin_challenges','lurin_events','lurin_event_attendees']}
DB['lurin_events']=[{'id':'00000000-0000-4000-8000-000000000333','title':'Encuentro de prueba de Lurín','description':'Actividad de prueba solo para comprobar la interfaz','starts_at':'2027-01-10T12:00:00+00:00','ends_at':'2027-01-10T14:00:00+00:00','zone':'Lurín Centro','visible':True}]
DB['lurin_rooms']=[{'id':'00000000-0000-4000-8000-000000000111','slug':'memorias','title':'Historias que nos unen','description':'Memoria colectiva','is_public':True},]
requests=[]

def validate_query(rows,qp):
    rows=list(rows)
    for k,v in qp.items():
        if not v:continue
        val=v[0]
        if val.startswith('eq.'):
            rows=[x for x in rows if str(x.get(k,'')).lower()==val[3:].lower()]
        elif val.startswith('in.(') and val.endswith(')'):
            allowed=set(val[4:-1].split(','));rows=[x for x in rows if str(x.get(k,'')) in allowed]
    if 'order' in qp:
        fld,_,direction=qp['order'][0].partition('.')
        rows.sort(key=lambda x:x.get(fld,'') or '',reverse=(direction=='desc'))
    if 'limit' in qp:rows=rows[:int(qp['limit'][0])]
    return rows


def handler(route):
    req=route.request
    addr=urlsplit(req.url);path=addr.path;method=req.method;qp=parse_qs(addr.query)
    requests.append((method,path))
    headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,DELETE,OPTIONS','content-type':'application/json'}
    if method=='OPTIONS':return route.fulfill(status=204,headers=headers,body='')
    header=req.headers.get('authorization','')
    token=header.removeprefix('Bearer ')
    user=next((u for u in users.values() if 'test-session-'+u['id']==token),None)
    who=user['id'] if user else None
    try:body=json.loads(req.post_data or '{}')
    except Exception:body={}
    status=200;data=None
    if path=='/auth/v1/token':
        email=body.get('email')
        if email not in users: status=400;data={'message':'Cuenta no encontrada'}
        else:
            u=users[email]
            data={'user':u,'access_token':'test-session-'+u['id'],'refresh_token':'refresh-'+u['id'],'expires_in':3600}
    elif path=='/auth/v1/logout':data={}
    elif not who:
        status=401;data={'message':'Autenticación requerida'}
    elif path.startswith('/rest/v1/rpc/'):
        if path.endswith('lurin_my_points'):data=sum(x['amount'] for x in DB['lurin_point_ledger'] if x['user_id']==who)
        elif path.endswith('lurin_top_raices'):
            data=[{'user_id':p['id'],'display_name':p['display_name'],'total_points':sum(x['amount'] for x in DB['lurin_point_ledger'] if x['user_id']==p['id'])} for p in DB['lurin_profiles']]
        else:status=404;data={'message':'RPC no encontrada'}
    elif path.startswith('/rest/v1/'):
        table=path.split('/')[-1]
        if table not in DB: status=404;data={'message':'Tabla no disponible'}
        elif method=='GET': data=validate_query(DB[table],qp)
        elif method=='POST':
            data=copy.deepcopy(body)
            if 'id' not in data:data['id']=str(uuid.uuid4())
            if table in ('lurin_posts','lurin_comments','lurin_messages'):
                data['created_at']='2026-10-29T03:00:00+00:00'
            if table=='lurin_posts':
                data['state']='published'
                DB['lurin_point_ledger'].append({'user_id':who,'amount':30,'reason':'publicacion','created_at':'2026-10-29T03:00:00+00:00'})
            if table=='lurin_comments':
                if len(data['body'])>=20:
                    DB['lurin_point_ledger'].append({'user_id':who,'amount':5,'reason':'comentario_util','created_at':'2026-10-29T03:00:00+00:00'})
            DB[table].append(data)
            data=[data]
        elif method=='DELETE':
            removed=validate_query(DB[table],qp)
            DB[table]=[x for x in DB[table] if x not in removed];data=None
    else:
        status=404;data={'message':'No encontrado: '+path}
    route.fulfill(status=status,headers=headers,body=json.dumps(data,ensure_ascii=False))

with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox','--disable-dev-shm-usage'])
  contexts=[];screens=[]
  for _ in range(2):
      context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,bypass_csp=True)
      context.route(url+'/**',handler)
      page=context.new_page();errors=[]
      page.on('pageerror',lambda e:errors.append(str(e)))
      page.set_content(html,wait_until='load')
      page.wait_for_function('window.LurinLive?.enabled === true')
      contexts.append(context);screens.append((page,errors))
  (a,errsA),(b,errsB)=screens
  for pg,email in [(a,'ana@lurin.test'),(b,'luis@lurin.test')]:
      pg.evaluate("go('login')")
      pg.locator('#liveEmail').fill(email)
      pg.locator('#livePassword').fill('password123')
      pg.locator('[data-live="auth"]').click()
      pg.wait_for_function("state.page === 'home' && window.LurinLive.userId !== null",timeout=14000)
  assert len(DB['lurin_profiles'])==2,DB['lurin_profiles']
  assert a.evaluate('window.LurinLive.userId')!=b.evaluate('window.LurinLive.userId')
  print('PASS: dos teléfonos / sesiones independientes')

  a.evaluate("go('compose')")
  a.locator('#liveTitle').fill('El camino del valle que nos une')
  a.locator('#liveBody').fill('Hoy compartimos una tarde entre paisajes, tradiciones y recuerdos con nuestra comunidad de Lurín.')
  a.locator('[data-live="publish"]').click()
  a.wait_for_function("state.page === 'published'",timeout=14000)
  assert len(DB['lurin_posts'])==1
  # Verificamos sincronización automática, sin pulsar Actualizar.
  b.wait_for_function("document.querySelector('#page').innerText.includes('El camino del valle que nos une')",timeout=18000)
  b.screenshot(path='test-artifacts/LURIN_BETA_V03_COMPARTIDO_PRUEBA.png',full_page=False)
  print('PASS: Ana publica -> Luis ve la historia en otro dispositivo')

  b.locator('[data-live="comments"]').first.click()
  b.wait_for_function("state.page === 'comments'",timeout=12000)
  b.locator('#liveComment').fill('Me gusta mucho esta historia del valle, gracias por compartirla.')
  b.locator('[data-live="sendComment"]').click()
  b.wait_for_function("document.querySelector('#page').innerText.includes('Me gusta mucho esta historia')",timeout=14000)
  assert len(DB['lurin_comments'])==1
  a.evaluate("go('home')")
  a.evaluate('window.LurinLive.refresh()')
  a.wait_for_function("document.querySelector('#page').innerText.includes('1')",timeout=12000)
  a.locator('[data-live="comments"]').first.click()
  a.wait_for_function("document.querySelector('#page').innerText.includes('Me gusta mucho esta historia')",timeout=14000)
  print('PASS: Luis comenta -> Ana ve comentario en su teléfono')

  b.evaluate("go('home')")
  b.locator('[data-live="like"]').first.click()
  b.wait_for_function("state.page === 'home' && document.querySelector('[data-live=like]').innerText.includes('1')",timeout=12000)
  assert len(DB['lurin_likes'])==1
  print('PASS: like sincronizado')

  # Follow an author, switch to feed of followed people, then unfollow.
  b.locator('[data-live="follow"]').first.click()
  b.wait_for_function("document.querySelector('[data-live=follow]')?.innerText.includes('Siguiendo')",timeout=12000)
  assert len(DB['lurin_follows'])==1, DB['lurin_follows']
  b.locator('[data-live="filterFeed"][data-value="following"]').click()
  assert 'El camino del valle que nos une' in b.locator('#page').inner_text()
  b.locator('[data-post-id]').first.scroll_into_view_if_needed()
  b.wait_for_timeout(1200)
  b.screenshot(path='test-artifacts/LURIN_BETA_V06_SIGUIENDO.png',full_page=False)
  b.locator('[data-live="follow"]').first.click()
  b.wait_for_function("document.querySelector('#page').innerText.includes('Todavía no sigues publicaciones')",timeout=12000)
  assert len(DB['lurin_follows'])==0
  b.locator('[data-live="filterFeed"][data-value="all"]').click()
  assert 'El camino del valle que nos une' in b.locator('#page').inner_text()
  print('PASS: seguir / dejar de seguir y filtro de publicaciones')

  # Confirmed events are read from the backend, never invented by the client.
  b.evaluate("go('events')")
  b.wait_for_function("document.querySelector('#page').innerText.includes('Encuentro de prueba de Lurín')",timeout=12000)
  b.locator('[data-live="toggleEvent"]').click()
  b.wait_for_function("document.querySelector('[data-live=toggleEvent]').innerText.includes('Cancelar asistencia')",timeout=12000)
  assert len(DB['lurin_event_attendees'])==1
  b.wait_for_timeout(1100)
  b.screenshot(path='test-artifacts/LURIN_BETA_V06_EVENTOS.png',full_page=False)
  b.locator('[data-live="toggleEvent"]').click()
  b.wait_for_function("document.querySelector('[data-live=toggleEvent]').innerText.includes('Me apunto')",timeout=12000)
  assert len(DB['lurin_event_attendees'])==0
  print('PASS: eventos confirmados, inscripción y cancelación sincronizadas')


  b.evaluate("go('groups')")
  b.wait_for_function("document.querySelector('#page').innerText.includes('Historias que nos unen')",timeout=10000)
  b.locator('[data-live="openRoom"]').first.click()
  b.wait_for_function("state.page==='chat'",timeout=12000)
  b.locator('#liveChatText').fill('Un saludo desde otro teléfono para los vecinos de Lurín.')
  b.locator('[data-live="sendChat"]').click()
  b.wait_for_function("document.querySelector('#page').innerText.includes('Un saludo desde otro teléfono')",timeout=12000)
  a.evaluate("go('groups')")
  a.wait_for_function("document.querySelector('#page').innerText.includes('Historias que nos unen')",timeout=12000)
  a.locator('[data-live="openRoom"]').first.click()
  a.wait_for_function("document.querySelector('#page').innerText.includes('Un saludo desde otro teléfono')",timeout=12000)
  print('PASS: chat grupal compartido entre dos cuentas')

  a.evaluate("go('wallet')")
  a.wait_for_function("state.points===30",timeout=12000)
  b.evaluate("go('wallet')")
  b.wait_for_function("state.points===5",timeout=12000)
  assert len(DB['lurin_point_ledger'])==2
  print('PASS: puntos solo según el ledger (simulado en backend), no dados por el cliente')

  assert not errsA,errsA
  assert not errsB,errsB
  print('PASS: sin errores JS; REST multiusuario',len(requests),'solicitudes')
  contexts[0].close();contexts[1].close();browser.close()
