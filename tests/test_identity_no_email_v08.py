
#!/usr/bin/env python3
"""QA de onboarding sin correo con Supabase simulado. No valida el servidor real."""
import os,json,tempfile,subprocess,uuid
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=Path(tempfile.gettempdir())/'lurin_v08_no_email_qa.html'
env={**os.environ,'LURIN_SUPABASE_URL':'https://lurin-test.supabase.co','LURIN_SUPABASE_PUBLISHABLE_KEY':'sb_publishable_test_v08','LURIN_BUNDLE_OUTPUT':str(out)}
p=subprocess.run(['python3','scripts/bundle_live.py','--require-online'],cwd=root,env=env,capture_output=True,text=True)
assert p.returncode==0,p.stderr
html=out.read_text()
users={};profiles={};events=[]
def session(kind,name,uid=None):
    uid=uid or str(uuid.uuid4())
    u={'id':uid,'email':'user@usuarios.lurin.invalid','app_metadata':{'lurin_identity_type':kind},'user_metadata':{'display_name':name}}
    users[uid]=u
    return {'user':u,'access_token':'jwt-'+uid,'refresh_token':'refresh-'+uid,'expires_in':3600,'lurin_account_type':kind}
def intercept(route):
    req=route.request;path=urlsplit(req.url).path
    args=parse_qs(urlsplit(req.url).query)
    try:data=json.loads(req.post_data or '{}')
    except:data={}
    h={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,DELETE,OPTIONS','content-type':'application/json'}
    if req.method=='OPTIONS':return route.fulfill(status=204,headers=h,body='')
    response=[]
    if path=='/functions/v1/lurin-identity':
        mode=data.get('action');events.append(mode)
        if mode in ('register','guest'):response=session('guest' if mode=='guest' else 'username',data.get('displayName','Visita'))
        elif mode=='upgrade':
            uid=list(users.keys())[-1];users[uid]['app_metadata']['lurin_identity_type']='username'
            response=session('username',users[uid]['user_metadata']['display_name'],uid)
        elif mode=='login':
            uid=list(users.keys())[-1];response=session('username',users[uid]['user_metadata']['display_name'],uid)
    elif path.startswith('/rest/v1/rpc/'):response=0 if path.endswith('lurin_my_points') else []
    elif path.startswith('/rest/v1/'):
        table=path.split('/')[-1]
        if table=='lurin_profiles':
            if req.method=='POST':profiles[data['id']]=data;response=[data]
            elif 'id' in args:
                uid=args['id'][0].removeprefix('eq.')
                response=[profiles[uid]] if uid in profiles else []
            else:response=list(profiles.values())
        else:response=[]
    elif path=='/auth/v1/token':
        uid=list(users.keys())[-1];response=session(users[uid]['app_metadata']['lurin_identity_type'],users[uid]['user_metadata']['display_name'],uid)
    return route.fulfill(status=200,headers=h,body=json.dumps(response))
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},bypass_csp=True)
    context.add_init_script('window.LurinAndroid={shareText:function(x){}}')
    context.route('https://lurin-test.supabase.co/**',intercept)
    page=context.new_page();err=[];page.on('pageerror',lambda e:err.append(str(e)))
    page.set_content(html,wait_until='load');page.wait_for_function('window.LurinLive?.enabled===true')
    page.locator('[data-go="role"]').first.click()
    page.locator('#nickname').fill('Visitante Lurín')
    page.locator('[data-v07="enterGuest"]').click()
    page.wait_for_function("state.page==='home' && LurinLive.userId!==null",timeout=20000)
    guest=page.evaluate('LurinLive.userId')
    page.evaluate("go('profile')")
    page.locator('[data-v08="protectGuest"]').click()
    page.locator('#lurinUsername').fill('visitante_lurin')
    page.locator('#lurinUsernamePassword').fill('ClaveSegura2026')
    page.locator('[data-v08="submitUsername"]').click()
    page.wait_for_function("state.page==='home'",timeout=20000)
    assert page.evaluate('LurinLive.userId')==guest,'Upgrade must preserve id'
    page.evaluate("go('profile')")
    page.locator('[data-live="logout"]').click()
    page.wait_for_function("state.page==='welcome'")
    page.locator('[data-go="role"]').first.click()
    page.locator('[data-v08="showUsername"]').click()
    assert page.locator('#liveEmail').count()==0,'No email should be required'
    page.locator('#lurinPublicName').fill('Vecino Lurín')
    page.locator('#lurinUsername').fill('vecino_lurin')
    page.locator('#lurinUsernamePassword').fill('ClaveSegura2026')
    page.locator('[data-v08="submitUsername"]').click()
    page.wait_for_function("state.page==='home'",timeout=20000)
    assert {'guest','upgrade','register'}.issubset(set(events)),events
    assert len(profiles)==2,profiles
    assert not err,err
    print('PASS: guest, upgrade, username registration without email, protected id, no JS errors')
    browser.close()
