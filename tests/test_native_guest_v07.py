#!/usr/bin/env python3
"""QA: visual Android a pantalla completa, visitante sin correo, contenido de ejemplo y retos reales.
Supabase simulado. No constituye prueba contra servicio real ni APK en dispositivo.
"""
import json, tempfile, subprocess, os, uuid
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
output=Path(tempfile.gettempdir())/'lurin_v07_native_guest.html'
cfg=dict(os.environ,LURIN_SUPABASE_URL='https://lurin-test.supabase.co',LURIN_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test_not_real_key_999',LURIN_BUNDLE_OUTPUT=str(output))
p=subprocess.run(['python3','scripts/bundle_live.py','--require-online'],cwd=ROOT,env=cfg,capture_output=True,text=True)
assert p.returncode==0,p.stderr
html=output.read_text()
url='https://lurin-test.supabase.co'
uid='11111111-1111-4111-8111-111111111111'
user={'id':uid,'email':'','is_anonymous':True,'user_metadata':{'display_name':'Visitante de prueba'}}
profile=[];submits=[]
challenges=[{'id':str(uuid.uuid4()),'title':title,'description':'Actividad comunitaria de prueba, fotos y relatos reales.', 'reward_points':points,'active':True,'starts_at':'2026-10-29T05:00:00Z','ends_at':'2027-02-28T23:59:59Z'} for title,points in [('Postales de nuestras raíces',50),('Relatos que nos unen',70),('Sabores con historia',45)]]
def handler(route):
    req=route.request;path=urlsplit(req.url).path;method=req.method; qp=parse_qs(urlsplit(req.url).query)
    headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,DELETE,OPTIONS','content-type':'application/json'}
    if method=='OPTIONS':return route.fulfill(status=204,headers=headers,body='')
    try: body=json.loads(req.post_data or '{}')
    except Exception:body={}
    result=[]
    if path=='/auth/v1/signup': result={'user':user,'access_token':'test-session-guest','refresh_token':'guest-refresh','expires_in':3600}
    elif path=='/auth/v1/token' and qp.get('grant_type')==['refresh_token']:result={'user':user,'access_token':'test-session-guest','refresh_token':'guest-refresh','expires_in':3600}
    elif path.startswith('/rest/v1/rpc/'):
        result=0 if path.endswith('lurin_my_points') else []
    elif path.startswith('/rest/v1/'):
        table=path.split('/')[-1]
        if table=='lurin_profiles':
            if method=='POST':profile.append(body);result=[body]
            else:result=profile
        elif table=='lurin_challenges':result=challenges
        elif table=='lurin_challenge_submissions':
            submits.append(body);result=[body]
        elif table=='lurin_rooms':result=[{'id':'22222222-2222-4222-8222-222222222222','title':'Historias que nos unen','description':'Sala beta','slug':'memorias'}]
        else:result=[]
    else: result={}
    return route.fulfill(status=200,headers=headers,body=json.dumps(result))

out=ROOT/'docs/screenshots';out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':750,'height':920},device_scale_factor=1,bypass_csp=True)
    ctx.add_init_script('window.LurinAndroid={shareText:function(x){}}')
    ctx.route(url+'/**',handler)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='load');page.wait_for_function('window.LurinLive?.enabled === true')
    page.wait_for_function("state.page === 'welcome'")
    metrics=page.evaluate('''() => {const d=document.querySelector('#device'),b=document.body;return {bodyWidth:b.clientWidth,phoneWidth:d.getBoundingClientRect().width,border:getComputedStyle(d).borderWidth,radius:getComputedStyle(d).borderRadius,padding:getComputedStyle(b).paddingLeft}}''')
    assert metrics['phoneWidth']==750,metrics
    assert metrics['border']=='0px' and metrics['radius']=='0px',metrics
    page.screenshot(path=str(out/'v07_inicio_android_sin_marco.png'))
    page.locator('[data-go="role"]').first.click()
    page.locator('#nickname').fill('Maru')
    page.locator('[data-v07="enterGuest"]').click()
    page.wait_for_function("state.page === 'home' && window.LurinLive?.userId !== null",timeout=20000)
    page.get_by_text('HISTORIA DE EJEMPLO',exact=False).first.wait_for(timeout=15000)
    assert len(profile)==1 and profile[0]['display_name']=='Maru',profile
    assert page.locator('.sample-story').count()==3
    page.screenshot(path=str(out/'v07_muro_ejemplos.png'),full_page=False)
    page.locator('[data-v07="sampleStory"]').first.click()
    page.wait_for_function("state.page === 'samplePost'")
    assert page.get_by_text('EJEMPLO FICTICIO',exact=False).count()>0
    page.evaluate("go('rewards')")
    page.get_by_text('Descuento en sabores de Lurín').wait_for()
    assert page.locator('.reward-showcase').count()==4
    assert '180 raíces' in page.locator('#page').inner_text()
    page.screenshot(path=str(out/'v07_recompensas_propuestas.png'))
    page.locator('[data-v07="rewardDetail"]').first.click()
    page.wait_for_function("state.page === 'reward'")
    assert page.get_by_text('NO CANJEABLE',exact=False).count()>=1
    page.evaluate("go('challenges')")
    page.get_by_text('Postales de nuestras raíces').wait_for()
    assert page.locator('.ch-card').count()==3
    page.screenshot(path=str(out/'v07_retos_comunitarios.png'))
    page.get_by_text('Participar',exact=True).nth(1).click()
    page.wait_for_function("state.page === 'challengeDetail'")
    page.locator('[data-live="challengeGo"]').click()
    page.locator('#liveChallengeText').fill('Historia original de mi barrio: una tradición que comparto con mi familia y vecinos de Lurín.')
    page.locator('[data-v07="sendChallenge"]').click()
    page.wait_for_function("state.page === 'challengeDone'",timeout=16000)
    assert len(submits)==1,submits
    assert not errors,errors
    print('PASS: Android full screen, onboarding sin correo, post de muestra marcado, 4 recompensas propuestas, 3 retos, envío de prueba, JS sin errores')
    browser.close()
