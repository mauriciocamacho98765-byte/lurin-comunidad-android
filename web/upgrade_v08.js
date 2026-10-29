
/* Lurín v0.8: cuentas de visitante o usuario con contraseña, sin pedir correo */
let lurinUserMode='login',lurinUserNotice='',lurinUserBusy=false;
function isLurinGuest(){return session?.user?.app_metadata?.lurin_identity_type==='guest'||session?.lurin_account_type==='guest';}
function screenUsername(){
const upgrade=lurinUserMode==='upgrade',register=lurinUserMode==='register';
const html=header(upgrade?'Proteger mi cuenta':'Cuenta sin correo',upgrade?'profile':'role')
+'<div class="eyebrow" style="margin-top:22px">LURÍN · SIN CORREO</div>'
+'<h1 class="big">'+(upgrade?'Conserva tus raíces':register?'Crea tu usuario':'Bienvenido de vuelta')+'</h1>'
+'<p class="small muted">'+(upgrade?'Protege tu cuenta de visitante. Mantendrás tus historias y puntos.':register?'Elige un nombre público, usuario y contraseña. No pedimos correo.':'Entra con tu usuario y contraseña, sin correo.')+'</p>'
+'<div class="card padded" style="margin-top:15px">'
+(register?'<label class="field-label">Nombre público</label><input id="lurinPublicName" class="field" maxlength="65" placeholder="Tu nombre o apodo">':'')
+'<label class="field-label">Usuario</label><input id="lurinUsername" class="field" maxlength="24" autocapitalize="none" autocomplete="username" spellcheck="false" placeholder="ejemplo: mario_lurin">'
+'<p class="hint">3 a 24 caracteres: letras, números y _. Comienza con una letra.</p>'
+'<label class="field-label">Contraseña</label><input type="password" id="lurinUsernamePassword" class="field" maxlength="72" autocomplete="'+(register||upgrade?'new-password':'current-password')+'" placeholder="Mínimo 10 caracteres">'
+(register||upgrade?'<p class="hint">Utiliza una contraseña con letras y números.</p>':'')
+'<div style="margin-top:15px"><button class="primary" data-v08="submitUsername" '+(lurinUserBusy?'disabled':'')+'>'+(upgrade?'Guardar usuario y contraseña':register?'Crear mi cuenta sin correo':'Entrar con mi usuario')+'</button></div>'
+(lurinUserNotice?'<p class="info-note" role="status">'+h(lurinUserNotice)+'</p>':'')+'</div>'
+(!upgrade?'<div class="row between" style="margin-top:15px"><button class="link" data-v08="switchUsernameMode">'+(register?'Ya tengo usuario':'Crear usuario nuevo')+'</button><button class="link" data-v08="returnGuest">Entrar como visitante</button></div>':'')
+'<p class="info-note">No solicitamos correo. Si olvidas la contraseña todavía no hay recuperación automática. Un visitante que cierre sesión sin proteger su cuenta puede perder acceso.</p>';
return wrap(html);
}
views.usernameAuth=screenUsername;
const oldProfileNoEmail=views.profile;
views.profile=function(){
let html=oldProfileNoEmail();
if(!isLurinGuest()){if(session?.lurin_username)html=html.replace('Usuario registrado','Usuario: @'+h(session.lurin_username));return html;}
return html.replace('<div style="margin-top:15px">','<div class="card padded" style="margin-top:12px"><b>Protege tu cuenta de visitante</b><p class="small muted">Crea un usuario y contraseña para recuperar tus historias en otro teléfono.</p><button class="primary" data-v08="protectGuest">Proteger mi cuenta</button></div><div style="margin-top:15px">');
};
const previousGoNoEmail=window.go;
window.go=function(page){
if(page==='usernameAuth'){if(!sessionUser()||isLurinGuest()){state.page=page;render();return;}state.page='profile';render();return;}
return previousGoNoEmail(page);
};
async function actionNoEmail(action){
try{
if(action==='showUsername'){lurinUserMode='register';lurinUserNotice='';go('usernameAuth');return;}
if(action==='protectGuest'){lurinUserMode='upgrade';lurinUserNotice='';go('usernameAuth');return;}
if(action==='switchUsernameMode'){lurinUserMode=lurinUserMode==='register'?'login':'register';lurinUserNotice='';render();return;}
if(action==='returnGuest'){state.page='role';render();return;}
if(action!=='submitUsername'||lurinUserBusy)return;
const username=String(document.getElementById('lurinUsername')?.value||'').trim().toLowerCase();
const password=String(document.getElementById('lurinUsernamePassword')?.value||'');
const name=String(document.getElementById('lurinPublicName')?.value||'').trim();
if(!/^[a-z][a-z0-9_]{2,23}$/.test(username))throw Error('Usuario inválido: de 3 a 24 caracteres, empieza con letra.');
if(lurinUserMode!=='login'&&(password.length<10||!/[a-zA-Z]/.test(password)||!/[0-9]/.test(password)))throw Error('Contraseña: mínimo 10 caracteres con letras y números.');
if(lurinUserMode==='register'&&(name.length<2||name.length>65))throw Error('Escribe tu nombre público.');
lurinUserBusy=true;lurinUserNotice='';
const mode=lurinUserMode==='register'?'register':lurinUserMode==='upgrade'?'upgrade':'login';
const result=await request('/functions/v1/lurin-identity',{method:'POST',auth:mode==='upgrade',body:{action:mode,username,password,...(mode==='register'?{displayName:name}:{})}});
if(!result?.access_token||!result?.refresh_token||!result?.user?.id)throw Error('No se pudo iniciar sesión.');
signupDisplayName=mode==='register'?name:'';signupUsername=mode==='register'?username:'';
setSession({...result,lurin_username:username});await ensureProfile();
lurinUserBusy=false;state.page='home';render();
await Promise.all([loadFeed({quiet:true}),loadRooms(),refreshPoints(),loadChallenges()]);
announce(mode==='upgrade'?'Cuenta protegida. Puedes entrar desde otros teléfonos.':'¡Bienvenido a tu comunidad!');
}catch(err){lurinUserBusy=false;lurinUserNotice=String(err?.message||'Error de conexión').slice(0,150);pubError(err);if(state.page==='usernameAuth')render();}
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-v08]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();void actionNoEmail(button.dataset.v08);},true);
