const API=(Deno.env.get('SUPABASE_URL')||'').replace(/\/$/,'');
const SECRET=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const ANON=Deno.env.get('SUPABASE_ANON_KEY')||'';
const headersBase={'Content-Type':'application/json','Cache-Control':'no-store'};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...headersBase,...cors}});
const norm=x=>String(x||'').trim().toLowerCase();
const validUsername=x=>/^[a-z][a-z0-9_]{2,23}$/.test(x)&&!/^(admin|administrador|root|soporte|moderador|lurin|oficial|visitante)$/.test(x);
const validName=x=>x.length>=2&&x.length<=65&&!/[\u0000-\u001f<>]/.test(x);
const validPass=x=>x.length>=10&&x.length<=72&&/[a-zA-Z]/.test(x)&&/[0-9]/.test(x);
const enc=new TextEncoder();
async function alias(name){
 const k=await crypto.subtle.importKey('raw',enc.encode(SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const v=new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode('lurin:v1:'+name)));
 return 'u'+Array.from(v).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,46)+'@usuarios.lurin.invalid';
}
async function api(path,method,body,admin=true,token){
 const k=admin?SECRET:ANON;
 const r=await fetch(API+path,{method,headers:{...headersBase,apikey:k,Authorization:'Bearer '+(token||k)},body:body===undefined?undefined:JSON.stringify(body)});
 const t=await r.text();let data;
 try{data=t?JSON.parse(t):{}}catch{data={message:t.slice(0,120)}}
 return {ok:r.ok,status:r.status,data};
}
async function quota(req,kind,max,seconds){
 const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||'unknown';
 const b=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(SECRET+':'+ip+':'+kind)));
 const bucket=Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
 const r=await api('/rest/v1/rpc/lurin_take_identity_quota','POST',{bucket,max_hits:max,window_seconds:seconds});
 return r.ok&&r.data===true;
}
const create=(email,password,name,type)=>api('/auth/v1/admin/users','POST',{email,password,email_confirm:true,user_metadata:{display_name:name},app_metadata:{lurin_identity_type:type}});
const login=(email,password)=>api('/auth/v1/token?grant_type=password','POST',{email,password},false);
const remove=async id=>{if(/^[0-9a-f-]{36}$/.test(id||''))await api('/auth/v1/admin/users/'+id,'DELETE')};
const reserve=(username,id)=>api('/rest/v1/lurin_usernames','POST',{username,user_id:id});
const unreserve=username=>api('/rest/v1/lurin_usernames?username=eq.'+encodeURIComponent(username),'DELETE');
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({error:'Método no permitido.'},405);
 if(!API||!SECRET||!ANON)return json({error:'Autenticación temporalmente no disponible.'},503);
 if(Number(req.headers.get('content-length')||0)>2400)return json({error:'Solicitud demasiado grande.'},413);
 let input={};try{input=await req.json()}catch{return json({error:'Solicitud incorrecta.'},400)}
 const action=norm(input?.action), username=norm(input?.username), password=String(input?.password||''),name=String(input?.displayName||'').trim();
 if(!['guest','register','login','upgrade'].includes(action))return json({error:'Acción no disponible.'},400);
 if(['guest','register'].includes(action)&&!validName(name))return json({error:'Escribe un nombre público de 2 a 65 caracteres.'},400);
 if(['register','upgrade'].includes(action)&&(!validUsername(username)||!validPass(password)))return json({error:'Usuario: 3 a 24 caracteres. Contraseña: mínimo 10, con letras y números.'},400);
 if(action==='login'&&(!validUsername(username)||!password))return json({error:'Introduce tu usuario y contraseña.'},400);
 const l={guest:[5,3600],register:[4,3600],login:[25,600],upgrade:[5,3600]};
 try{
  if(!(await quota(req,action,...l[action])))return json({error:'Demasiados intentos. Prueba más tarde.'},429);
  if(action==='guest'){
   const email='v'+crypto.randomUUID().replaceAll('-','')+'@usuarios.lurin.invalid',pass=crypto.randomUUID()+crypto.randomUUID();
   const created=await create(email,pass,name,'guest');
   if(!created.ok||!created.data?.id)return json({error:'No se pudo crear tu acceso de visitante. Intenta de nuevo.'},503);
   const res=await login(email,pass);
   if(!res.ok||!res.data?.access_token){await remove(created.data.id);return json({error:'No se pudo abrir la sesión de visitante.'},503)}
   return json({...res.data,lurin_account_type:'guest'},201);
  }
  if(action==='register'){
   const email=await alias(username);
   const created=await create(email,password,name,'username');
   if(!created.ok||!created.data?.id)return json({error:'Este nombre de usuario no está disponible. Prueba con otro.'},409);
   const mapped=await reserve(username,created.data.id);
   if(!mapped.ok){await remove(created.data.id);return json({error:'Ese usuario ya está ocupado.'},409)}
   const res=await login(email,password);
   if(!res.ok||!res.data?.access_token)return json({error:'Cuenta creada. Entra usando tu usuario y contraseña.'},503);
   return json({...res.data,lurin_account_type:'username'},201);
  }
  if(action==='login'){
   const res=await login(await alias(username),password);
   if(!res.ok||!res.data?.access_token)return json({error:'Usuario o contraseña incorrectos.'},401);
   return json({...res.data,lurin_account_type:'username'});
  }
  if(action==='upgrade'){
   const jwt=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
   if(!jwt||jwt===ANON||jwt===SECRET)return json({error:'Primero entra como visitante.'},401);
   const me=await api('/auth/v1/user','GET',undefined,false,jwt);
   if(!me.ok||!me.data?.id||me.data?.app_metadata?.lurin_identity_type!=='guest')return json({error:'Necesitas una sesión de visitante válida.'},403);
   const email=await alias(username),reserveRes=await reserve(username,me.data.id);
   if(!reserveRes.ok)return json({error:'Usuario no disponible.'},409);
   const update=await api('/auth/v1/admin/users/'+me.data.id,'PUT',{email,password,email_confirm:true,app_metadata:{...me.data.app_metadata,lurin_identity_type:'username'}});
   if(!update.ok){await unreserve(username);return json({error:'No se pudo proteger tu cuenta. Conserva la sesión de visitante.'},503)}
   const res=await login(email,password);
   if(!res.ok||!res.data?.access_token)return json({error:'Cuenta protegida. Entra con tu usuario y contraseña.'},503);
   return json({...res.data,lurin_account_type:'username'});
  }
 }catch(_){return json({error:'Ocurrió un problema de conexión. Intenta nuevamente.'},503)}
 return json({error:'Acción no reconocida.'},400);
});