#!/usr/bin/env python3
"""Offline WebView-content smoke test in Chromium, via the identical HTTPS asset origin."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import io, json

root=Path(__file__).resolve().parents[1]
# Generate the offline demonstration independently from the connected Android APK.
from tempfile import TemporaryDirectory
import subprocess,os
with TemporaryDirectory() as tmp:
    demo=Path(tmp)/'lurin_demo.html'
    result=subprocess.run(['python3','scripts/bundle_live.py','--demo'],cwd=root,
        env={**os.environ,'LURIN_BUNDLE_OUTPUT':str(demo)},capture_output=True,text=True)
    assert result.returncode==0,result.stderr
    html=demo.read_text(encoding='utf8')

# Navigation to file://, localhost and even mocked HTTPS is restricted by
# this execution sandbox. The UI is tested with set_content; this does not
# certify Android WebView or browser-managed storage persistence.

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox','--disable-dev-shm-usage'])
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,accept_downloads=False,bypass_csp=True)
    page=context.new_page(); errors=[]; remote=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('request',lambda req:remote.append(req.url) if not req.url.startswith(('data:',origin)) else None)
    page.evaluate("""() => {let store={};Object.defineProperty(window,'localStorage',{
      configurable:true,value:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}}});window.__testStore=store;}""")
    page.set_content(html,wait_until='load')
    assert page.evaluate('state.page')=='welcome'
    routes=page.evaluate('Object.keys(views)')
    assert len(routes)==26, routes
    for route in routes:
        page.evaluate('(route)=>go(route)',route)
        assert page.locator('#page').inner_text().strip(),f'empty {route}'
        assert page.evaluate('state.page')==route
    print('PASS: all',len(routes),'routes render')

    # Verify app back stack is connected to real JS navigation.
    page.evaluate("go('home');go('challenges')")
    assert page.evaluate('window.lurinAndroidBack()') is True
    assert page.evaluate('state.page')=='home'

    # Test compressed Android photo workflow (the system picker uploads image data).
    photo=Image.new('RGB',(1600,1200))
    buf=io.BytesIO();photo.save(buf,format='PNG');png=buf.getvalue()
    page.evaluate("go('compose')")
    page.locator('#postPhoto').set_input_files({'name':'foto_lurin.png','mimeType':'image/png','buffer':png})
    page.wait_for_function("state.postPhoto && state.postPhoto.startsWith('data:image/jpeg;base64,')")
    assert len(page.evaluate('state.postPhoto'))<1200000
    page.locator('#postTitle').fill('Un paseo por el valle de Lurín')
    page.locator('#postCaption').fill('Compartimos un recorrido con nuestra comunidad para conocer historias y proteger nuestro paisaje.')
    before=page.evaluate('state.points')
    page.locator('[data-action="publish"]').click()
    assert page.evaluate('state.page')=='published'
    after=page.evaluate('state.points');assert after>before,(before,after)
    print('PASS: photo compression and published post (+',after-before,'demo points)')

    # Validate serialization to a storage API shim. Reload cannot be checked
    # because the browser sandbox blocks all navigations (including localhost).
    stored=page.evaluate("window.__testStore?.['lurin.app.demo']")
    assert stored and json.loads(stored)['points']==after
    assert len(json.loads(stored)['userPosts'])>=1
    print('PASS: save() persisted demo points and posts in a storage-compatible stub')

    # Comments and sharing don't leak a fictitious internal appassets URL.
    page.evaluate("go('home')")
    cards=page.locator('[data-action="comments"]')
    assert cards.count()>0
    cards.first.click()
    page.locator('#newcomment').fill('¡Qué buena historia de la comunidad de Lurín!')
    page.locator('[data-action="sendComment"]').click()
    assert page.evaluate('state.comments[state.postId].length')>=1
    page.evaluate("window.LurinAndroid={shareText:(txt)=>window.__shared=txt};go('home')")
    page.locator('[data-action="sharePost"]').first.click()
    shared=page.evaluate('window.__shared')
    assert shared and 'appassets.androidplatform.net' not in shared,shared
    print('PASS: comments and Android share demo text')

    # Retos (photo + text required) and local demo wallet.
    page.evaluate("state.challenge=challenges[0].id;go('challengeDetail')")
    page.locator('[data-action="joinChallenge"]').click()
    assert page.evaluate('state.page')=='submitChallenge'
    page.locator('#challengeFile').set_input_files({'name':'reto_lurin.png','mimeType':'image/png','buffer':png})
    page.wait_for_function('state.storyPhoto && state.storyPhoto.startsWith("data:image/jpeg;")')
    page.locator('#challengeText').fill('Nuestro grupo comparte una foto original del patrimonio de Lurín.')
    n=page.evaluate('state.points')
    page.locator('[data-action="submitChallenge"]').click()
    assert page.evaluate('state.page')=='challengeDone'
    assert page.evaluate('state.points')>n
    page.evaluate("go('wallet')")
    assert 'raíces' in page.locator('#page').inner_text().lower()
    print('PASS: challenge submission, photo, demo points and wallet')

    # Screenshots for visible design regression (not Android emulator certification).
    page.evaluate("state.userPosts=[];state.points=420;state.postPhoto='';state.storyPhoto='';go('home')")
    page.screenshot(path='/mnt/data/LURIN_ANDROID_V02_INICIO.png')
    page.evaluate("go('rewards')")
    page.screenshot(path='/mnt/data/LURIN_ANDROID_V02_RECOMPENSAS.png')

    assert not remote, f'External requests not allowed: {remote}'
    assert not errors, errors
    print('PASS: no remote requests, no JS exceptions')
    browser.close()
