/* Lurín Comunidad: multiusuario con REST Supabase; no requiere paquetes remotos.
 * El backend configura Auth + PostgREST + Storage. Son necesarias sus migraciones.
 * El cliente no utiliza jamás credenciales administrativas ni asigna puntos directamente.
 */
(() => {
 'use strict';
 const conf=window.LURIN_COMMUNITY_CONFIG||{};
 const url=String(conf.supabaseUrl||'').replace(/\/$/,'');
 const key=String(conf.publishableKey||'');
 const enabled=conf.enabled===true && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && /^(sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]+)$/.test(key);
 if(!enabled){
   // El APK sin backend configurado continúa siendo explícitamente una demo LOCAL.
   window.LurinLive={enabled:false,reason:'Se necesita Supabase independiente y una compilación con su clave publicable.'};
   const originalWelcome=views.welcome;
   views.welcome=()=>originalWelcome().replace('<div class="eyebrow" style="margin-top:33px">','<p class="info-note" style="margin-top:15px">MODO DEMOSTRACIÓN · Lo publicado aquí no aparece en otros teléfonos.</p><div class="eyebrow" style="margin-top:33px">');
   return;
 }

 // Nunca almacenar la contraseña. Solo tokens de sesión revocables en el WebView del teléfono.
 const sessionKey='lurin.community.session.v1';
 let session=null;
 let feedView='all',networkOnline=true,events=[],myEventIds=new Set();
 let authMode='login', signupDisplayName='', authNotice='', authBusy=false, busy=false;
 let feed=[], comments=[], chat=[], profiles=new Map(), roomsBySlug=new Map(), likedIds=new Set(), followingIds=new Set(),
     activeChallenges=[], leaderboard=[], mediaFile=null, photoPreview='', lastFeedSignature='', timer=null;
 const localEx=()=>window.escapeH?window.escapeH:escapeH;
 const h=v=>escapeH(String(v==null?'':v));
 const btn=(label,action,extra='')=>`<button class="primary" data-live="${action}" ${extra}>${h(label)}</button>`;
 const t=()=>`<span class="tiny muted">Las publicaciones se comparten entre teléfonos con conexión a Internet.</span>`;
 const status=()=>`<div class="live-pill" style="${networkOnline?'':'background:#fff4e5;color:#714517'}">${networkOnline?'● Comunidad conectada · Lurín':'● Sin conexión · vuelve a intentar'}</div>`;
 function setNetworkStatus(connected){
  if(networkOnline===connected)return;networkOnline=connected;
  const pill=document.querySelector('.live-pill');
  if(pill){pill.textContent=connected?'● Comunidad conectada · Lurín':'● Sin conexión · vuelve a intentar';pill.style.background=connected?'':'#fff4e5';pill.style.color=connected?'':'#714517';}
 }
 const announce=(text)=>notify(String(text).slice(0,150));
 const pubError=(err)=>{if(/fetch|network|internet|offline|Failed to fetch/i.test(String(err?.message||'')))setNetworkStatus(false);announce(err?.message||'Error de conexión. Intenta nuevamente.');};
 const profileFor=id=>profiles.get(id)||{display_name:'Comunidad Lurín',id};
 const maxText=(s,n)=>String(s||'').trim().slice(0,n);

 function guardAuth(){ if(!session?.user?.id){state.page='welcome';render();return false;}return true; }
 function nowSession(s){
   if(!s?.access_token || !s?.refresh_token) return null;
   return {...s,expires_at:s.expires_at||Math.floor(Date.now()/1000)+Number(s.expires_in||3600)};
 }
 function setSession(s){session=nowSession(s);try{if(session)localStorage.setItem(sessionKey,JSON.stringify(session));else localStorage.removeItem(sessionKey);}catch(_){} }
 function sessionUser(){return session?.user?.id||null;}
 async function refreshAuth(){
   if(!session?.refresh_token) throw Error('Tu sesión terminó. Ingresa nuevamente.');
   const res=await fetch(url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
   const value=await res.json();if(!res.ok) {setSession(null);throw Error('Tu sesión venció. Ingresa nuevamente.');}
   setSession(value);return session.access_token;
 }
 async function jwt(){if(!session?.access_token)throw Error('Inicia sesión para participar.');if(Date.now()/1000 > (session.expires_at||0)-80)await refreshAuth();return session.access_token;}
 async function request(path,{method='GET',body=null,auth=true,headers={}}={}){
   let token=auth?await jwt():null;
   const init={method,headers:{apikey:key,'Content-Type':'application/json',...headers}};
   if(token)init.headers.Authorization='Bearer '+token;
   if(body!==null)init.body=JSON.stringify(body);
   let resp;try{resp=await fetch(url+path,init);}catch(err){setNetworkStatus(false);throw err;}
   const raw=await resp.text();let result=null;
   try{result=raw?JSON.parse(raw):null;}catch{result=raw;}
   if(resp.ok) setNetworkStatus(true);
   if(!resp.ok){const message=result?.message||result?.msg||result?.error_description||result?.error||('Solicitud fallida ('+resp.status+')');throw Error(String(message).slice(0,180));}
   return result;
 }
 function query(table,params={}){
   const q=new URLSearchParams(params);
   return request('/rest/v1/'+table+'?'+q.toString());
 }
 function post(table,record){return request('/rest/v1/'+table,{method:'POST',body:record,headers:{Prefer:'return=representation'}});}
 async function deleteWhere(table,filters){const q=new URLSearchParams(filters);return request('/rest/v1/'+table+'?'+q.toString(),{method:'DELETE'});}
 async function auth(email,password,isNew,name){
   const endpoint=isNew?'/auth/v1/signup':'/auth/v1/token?grant_type=password';
   const payload=isNew?{email,password,data:{display_name:name}}:{email,password};
   const res=await request(endpoint,{method:'POST',body:payload,auth:false});
   if(isNew&&!res?.access_token){authNotice='Revisa tu correo y confirma la cuenta antes de iniciar sesión.';authMode='login';return false;}
   if(!res?.access_token) throw Error('Credenciales no válidas.');
   setSession(res);return true;
 }
 async function ensureProfile(){
   const my=sessionUser();if(!my)return;
   const profilesFound=await query('lurin_profiles',{select:'id,display_name,handle','id':'eq.'+my,limit:'1'});
   if(profilesFound.length){profiles.set(my,profilesFound[0]);state.nickname=profilesFound[0].display_name;return;}
   const email=String(session.user.email||'');
   const first=(signupDisplayName||session.user.user_metadata?.display_name||email.split('@')[0]||'Visitante').slice(0,65);
   const safeName=first.trim().length>=2?first.trim():'Visitante de Lurín';
   const base=String(email.split('@')[0]||'lurin').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,17)||'lurin';
   for(let i=0;i<4;i++){
     const handle=(base+'_'+Math.random().toString(36).slice(2,9)).slice(0,30);
     try{const records=await post('lurin_profiles',{id:my,display_name:safeName,handle});
       const record=records?.[0]||{id:my,display_name:safeName,handle};profiles.set(my,record);state.nickname=safeName;return;
     }catch(err){if(!/duplicate|unique|23505|409/.test(err.message.toLowerCase()))throw err;}
   }
   throw Error('No se pudo preparar tu perfil. Reintenta iniciar sesión.');
 }
 function imageUrl(path){
   if(!path||!/^[0-9a-f-]{36}\/[0-9a-f-]{24,70}\.(jpg|jpeg|webp|png)$/.test(path))return '';
   return url+'/storage/v1/object/public/lurin-fotos/'+path.split('/').map(encodeURIComponent).join('/');
 }
 async function refreshPoints(){
   if(!sessionUser())return;
   const rows=await query('lurin_point_ledger',{select:'amount,reason,created_at',user_id:'eq.'+sessionUser(),limit:'150',order:'created_at.desc'});
   // La suma completa se obtiene en el servidor de ranking para no truncar el saldo.
   const board=await request('/rest/v1/rpc/lurin_top_raices',{method:'POST',body:{}});
   leaderboard=Array.isArray(board)?board:[];
   state.points=Number(await request('/rest/v1/rpc/lurin_my_points',{method:'POST',body:{}})||0);
   state.history=rows.slice(0,12).map(x=>({pts:Number(x.amount),label:x.reason}));
 }
 async function loadFeed({quiet=false}={}){
   if(!sessionUser())return;
   try{
     const [rows,people]=await Promise.all([
       query('lurin_posts',{select:'id,author_id,title,body,category,image_path,created_at,state',state:'eq.published',order:'created_at.desc',limit:'75'}),
       query('lurin_profiles',{select:'id,display_name,handle',limit:'400'})
     ]);
     profiles=new Map(people.map(x=>[x.id,x]));
     const my=profiles.get(sessionUser());if(my)state.nickname=my.display_name;
     const ids=(rows||[]).map(x=>x.id);
     let likes=[], allComments=[];
     const follows=await query('lurin_follows',{select:'follower_id,followed_id',follower_id:'eq.'+sessionUser(),limit:'500'});
     if(ids.length){
       const inVal='in.('+ids.join(',')+')';
       [likes,allComments]=await Promise.all([
         query('lurin_likes',{select:'author_id,post_id',post_id:inVal,limit:'3000'}),
         query('lurin_comments',{select:'id,post_id,author_id,body,created_at',post_id:inVal,limit:'3000'})
       ]);
     }
     likedIds=new Set(likes.filter(x=>x.author_id===sessionUser()).map(x=>x.post_id));
     followingIds=new Set(follows.map(x=>x.followed_id));
     const counts=new Map(),commentCount=new Map();
     likes.forEach(x=>counts.set(x.post_id,(counts.get(x.post_id)||0)+1));
     allComments.forEach(x=>commentCount.set(x.post_id,(commentCount.get(x.post_id)||0)+1));
     feed=rows.map(x=>({...x,likes:counts.get(x.id)||0,comments:commentCount.get(x.id)||0,author:profileFor(x.author_id).display_name,image:imageUrl(x.image_path)}));
     state.userPosts=feed.filter(x=>x.author_id===sessionUser());
     const signature=feed.map(x=>x.id+':'+x.likes+':'+x.comments+':'+x.author_id).join('|')+'#'+[...followingIds].sort().join(',');
     if(signature!==lastFeedSignature){lastFeedSignature=signature;if(['home','post','comments','profile'].includes(state.page))render();}
   }catch(err){if(!quiet)pubError(err);}
 }
 async function loadComments(postId){
   if(!postId||!sessionUser())return;
   try{
     const rows=await query('lurin_comments',{select:'id,post_id,author_id,body,created_at',post_id:'eq.'+postId,limit:'120',order:'created_at.asc'});
     comments=rows.map(x=>({...x,author:profileFor(x.author_id).display_name}));
     if(state.page==='comments')render();
   }catch(err){pubError(err);}
 }
 async function loadMessages(slug){
   const room=roomsBySlug.get(slug);if(!room)return;
   const rows=await query('lurin_messages',{select:'id,room_id,author_id,body,created_at',room_id:'eq.'+room.id,limit:'120',order:'created_at.asc'});
   chat=rows.map(x=>({...x,author:profileFor(x.author_id).display_name}));
   if(state.page==='chat'&&state.room===slug)render();
 }
 async function loadRooms(){
   const rows=await query('lurin_rooms',{select:'id,title,description,slug',is_public:'eq.true'});
   roomsBySlug=new Map(rows.map(x=>[x.slug,x]));
 }
 async function joinRoom(slug){
   const room=roomsBySlug.get(slug);if(!room)throw Error('Grupo no disponible.');
   const record=await query('lurin_room_members',{select:'room_id,user_id',room_id:'eq.'+room.id,user_id:'eq.'+sessionUser(),limit:'1'});
   if(!record.length)await post('lurin_room_members',{room_id:room.id,user_id:sessionUser()});
 }
 async function loadChallenges(){
   try{activeChallenges=await query('lurin_challenges',{select:'id,title,description,starts_at,ends_at,reward_points,active',active:'eq.true',limit:'30'});}
   catch(err){pubError(err);}
 }
 async function loadEvents(){
   const today=new Date().toISOString();
   const [rows,joined]=await Promise.all([
     query('lurin_events',{select:'id,title,description,starts_at,ends_at,zone,visible',visible:'eq.true',order:'starts_at.asc',limit:'40'}),
     query('lurin_event_attendees',{select:'event_id,user_id',user_id:'eq.'+sessionUser(),limit:'200'})
   ]);
   events=rows.filter(x=>x.ends_at>=today);
   myEventIds=new Set(joined.map(x=>x.event_id));
   if(state.page==='events')render();
 }
 async function uploadPhoto(file){
   if(!file)return null;
   if(!file.type.startsWith('image/'))throw Error('Selecciona una imagen.');
   if(file.size>8*1024*1024)throw Error('La fotografía debe pesar menos de 8 MB.');
   const jpeg=await new Promise((resolve,reject)=>{
     const temp=URL.createObjectURL(file),img=new Image();
     img.onerror=()=>{URL.revokeObjectURL(temp);reject(Error('No se pudo leer la imagen.'))};
     img.onload=()=>{
       try{
         const scale=Math.min(1,1400/Math.max(img.width,img.height));
         const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
         const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);
         canvas.toBlob(b=>{URL.revokeObjectURL(temp);b?resolve(b):reject(Error('No se pudo comprimir la foto.'));},'image/jpeg',0.78);
       }catch(err){URL.revokeObjectURL(temp);reject(err);}
     };img.src=temp;
   });
   if(jpeg.size>4.8*1024*1024)throw Error('La imagen procesada pesa demasiado.');
   const id=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)).toLowerCase();
   const path=sessionUser()+'/'+id+'.jpg';
   const token=await jwt();
   const response=await fetch(url+'/storage/v1/object/lurin-fotos/'+path,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'image/jpeg','x-upsert':'false'},body:jpeg});
   if(!response.ok){let result={};try{result=await response.json()}catch{};throw Error(result.message||'Error al subir la fotografía.');}
   return path;
 }
 async function discardPhoto(path){
   if(!path)return;
   try{await request('/storage/v1/object/lurin-fotos',{method:'DELETE',body:{prefixes:[path]}});}catch(_){}
 }
 function makePostCard(post){
   const mine=post.author_id===sessionUser(),selected=likedIds.has(post.id);
   const date=post.created_at?new Date(post.created_at).toLocaleDateString('es-PE',{day:'numeric',month:'short'}):'Hoy';
   return `<article class="post live-post" data-post-id="${h(post.id)}"><div class="post-top"><div class="avatar gold">${h(post.author).slice(0,2).toUpperCase()}</div><div style="flex:1"><strong>${h(post.author)}</strong><span>Comunidad de Lurín · ${h(date)}</span></div>${mine?'':`<button data-live="follow" data-id="${h(post.author_id)}" class="link" aria-label="Seguir a ${h(post.author)}">${followingIds.has(post.author_id)?'Siguiendo ✓':'+ Seguir'}</button>`}<span class="small-pill">${h(post.category==='foto'?'Fotografía':post.category==='recomendacion'?'Recomendación':'Historia')}</span></div>
     ${post.image?`<img class="photo" src="${h(post.image)}" alt="Foto publicada por ${h(post.author)}" loading="lazy">`:''}
     <div class="copy"><strong>${h(post.title)}</strong><br>${h(post.body)}</div>
     <div class="post-tools"><button data-live="like" data-id="${h(post.id)}" class="${selected?'liked':''}">${I('heart',16)} ${post.likes||0}</button>
       <button data-live="comments" data-id="${h(post.id)}">${I('chat',16)} ${post.comments||0}</button>
       <button data-live="share" data-id="${h(post.id)}">${I('share',16)} Compartir</button>
       ${mine?`<button data-live="delete" data-id="${h(post.id)}">${I('trash',16)} Borrar</button>`:`<button data-live="report" data-id="${h(post.id)}">Reportar</button>`}</div></article>`;
 }
 function liveWelcome(){
   return wrap(`${header('Lurín Comunidad · Cuenta','welcome')}<div class="welcome-logo-no-card" style="display:flex;align-items:center;gap:16px;padding:8px 4px;margin:5px 0 14px;background:transparent;border:none;box-shadow:none;border-radius:0">
       <img src="${IMG('lurin_logo_oficial.png')}" alt="Logo original Lurín en colores completos" style="width:69px;height:120px;object-fit:contain;opacity:1;filter:none;flex-shrink:0">
       <div style="min-width:0"><div class="eyebrow">COMUNIDAD DE LURÍN</div><b style="font-size:18px;color:var(--indigo);line-height:1.22">Celebra tus raíces, vive Lurín</b></div>
      </div><div class="eyebrow">LA COMUNIDAD ES DE TODOS</div>
      <h1 class="big">${authMode==='register'?'Crea tu cuenta':'Vuelve a tus raíces'}</h1>
      <p class="small muted">${authMode==='register'?'Publica fotos y participa con una identidad propia.':'Entra para compartir publicaciones y leer las de otros teléfonos.'}</p>
      <div class="card padded" style="margin-top:17px">
       ${authMode==='register'?'<label class="field-label">Nombre público</label><input class="field" id="liveName" maxlength="65" placeholder="Cómo quieres aparecer en Lurín">':''}
       <label class="field-label">Correo electrónico</label><input class="field" type="email" id="liveEmail" autocomplete="email" maxlength="180" placeholder="tu@correo.com">
       <label class="field-label">Contraseña</label><input class="field" type="password" id="livePassword" autocomplete="${authMode==='register'?'new-password':'current-password'}" placeholder="Mínimo 6 caracteres">
       <div style="margin-top:15px">${btn(authMode==='register'?'Crear mi cuenta':'Entrar a la comunidad','auth',authBusy?'disabled':'')}</div>
       <p class="small muted" style="margin:13px 0 0">${h(authNotice)}</p>
      </div>
      <button class="link" style="margin:16px 0" data-live="toggleAuth">${authMode==='register'?'¿Ya tienes cuenta? Ingresa':'¿Es tu primera visita? Regístrate'}</button>
      <p class="info-note">Tu contraseña no se publica. El contenido de la comunidad es visible para otros usuarios registrados.</p>`);
 }
 function liveHome(){
   const displayed=feedView==='following'?feed.filter(p=>followingIds.has(p.author_id)):feed;
   const emptyLabel=feedView==='following'?'Todavía no sigues publicaciones':'La comunidad está empezando';
   const emptyText=feedView==='following'?'Usa Seguir en una publicación para encontrar aquí a esas personas.':'Todavía no hay publicaciones compartidas. Sé la primera persona en contar una historia.';
   return wrap(`${header()}<div class="row between" style="margin:12px 0"><span class="eyebrow">HOLA, ${h(state.nickname).toUpperCase()} ✦</span><span class="small-pill gold">${I('spark',12)} ${state.points} raíces</span></div>${status()}
     <div class="hero" style="margin-top:12px"><div class="curve"></div><span style="font-size:10px;font-weight:800;letter-spacing:1.4px;color:#e8e8bd">RAÍCES INQUEBRANTABLES</span><h1>La historia de Lurín la escribimos juntos.</h1><p>Publica tus recuerdos y conoce lo que comparte la comunidad.</p><img class="hero-image" src="${IMG('caballos.jpg')}" alt="Tradiciones de Lurín"><button class="btn-inline" data-go="compose" style="position:relative;z-index:2;margin-top:10px;background:#c0b353;color:#273153">${I('plus',13)} Crear historia</button></div>
     <div class="grid2"><button class="promo" data-go="groups"><div class="text"><div class="eyebrow">RED SOCIAL</div><b>Conversa con tu gente</b><span>Grupos abiertos</span></div><img src="${IMG('alfareria.jpg')}"></button><button class="promo" data-go="discover" style="background:#e9eef5"><div class="text"><div class="eyebrow" style="color:var(--indigo)">EXPLORA</div><b>Conoce nuevos lugares</b><span>Historias y paisajes</span></div><img src="${IMG('pachacamac.jpg')}"></button></div>
     <div class="section-row"><h2>Publicaciones de Lurín</h2><button class="link" data-live="refresh">Actualizar</button></div>
     <div class="pill-tabs" style="margin:7px 0 15px"><button data-live="filterFeed" data-value="all" class="${feedView==='all'?'active':''}">Todos</button><button data-live="filterFeed" data-value="following" class="${feedView==='following'?'active':''}">Siguiendo</button></div>
     ${displayed.length?displayed.map(makePostCard).join(''):'<div class="card padded"><b>'+emptyLabel+'</b><p class="small muted">'+emptyText+'</p></div>'}
     <p class="info-note">Las publicaciones de otros teléfonos aparecen aquí al sincronizar (aprox. cada 6 segundos con la app abierta).</p>`, 'home');
 }
 function liveDetail(){const p=feed.find(x=>x.id===state.postId);if(!p)return wrap(`${header('Historia','home')}<p class="small muted">Esta publicación ya no está disponible.</p>`,'home');return wrap(`${header('Una historia de Lurín','home')}${makePostCard(p)}<div style="margin-top:14px">${btn('Ver comentarios','comments',`data-id="${h(p.id)}"`)}</div>`,'home')}
 function liveComments(){const post=feed.find(x=>x.id===state.postId);return wrap(`${header('Comentarios','home')}<div class="card padded"><b>${h(post?.title||'Historia compartida')}</b></div><div style="margin:20px 0">${comments.length?comments.map(x=>`<div class="row" style="align-items:flex-start;margin:14px 0"><div class="avatar blue" style="width:31px;height:31px">${h(x.author).slice(0,2).toUpperCase()}</div><div class="card padded" style="flex:1"><b class="small">${h(x.author)}</b><p class="small" style="line-height:1.5">${h(x.body)}</p></div></div>`).join(''):'<p class="small muted">Todavía no hay comentarios. Inicia la conversación.</p>'}</div><div class="card padded"><label class="field-label">Tu comentario</label><textarea class="field" id="liveComment" rows="3" maxlength="600" placeholder="Escribe con respeto..."></textarea><p class="hint">Por comentarios útiles de más de 20 caracteres puedes recibir raíces (hasta 5 al día).</p>${btn('Publicar comentario','sendComment',busy?'disabled':'')}</div>`,'home')}
 function liveCompose(){return wrap(`${header('Nueva publicación','home')}<div class="eyebrow">CREA Y COMPARTE</div><h1 class="big">¿Qué historia contarás hoy?</h1><div class="card padded"><label class="field-label">Título</label><input class="field" maxlength="140" id="liveTitle" placeholder="Un recuerdo especial de Lurín"><label class="field-label">Historia o descripción</label><textarea class="field" maxlength="3500" id="liveBody" rows="5" placeholder="Cuéntale a la comunidad tu experiencia..."></textarea><label class="field-label">Categoría</label><select class="field" id="liveCategory"><option value="historia">Historia</option><option value="foto">Fotografía</option><option value="tradicion">Tradición</option><option value="recomendacion">Recomendación</option></select><label class="field-label">Fotografía (opcional)</label><label class="photo-box" for="livePhotoFile">${photoPreview?`<img src="${h(photoPreview)}" style="width:100%;height:100%;object-fit:cover" alt="Vista previa de tu foto">`:`<div style="display:grid;place-items:center;height:100%;width:100%">${I('camera',30)}<b class="small">Seleccionar fotografía</b><span class="tiny">Se comprime antes de subir</span></div>`}</label><input hidden type="file" accept="image/*" id="livePhotoFile"><p class="hint">Las fotos deben ser propias y apropiadas para todos. No publiques datos personales de terceros.</p><div style="margin-top:15px">${btn(busy?'Publicando...':'Publicar para todos','publish',busy?'disabled':'')}</div></div>`, 'home')}
 function livePublished(){return wrap(`${header('¡Publicado!','home')}<div class="confetti" style="margin-top:25px"><div class="avatar gold" style="width:86px;height:86px;margin:auto">${I('check',42)}</div><h1 class="big">¡Tu historia ya forma parte de Lurín!</h1><p class="small muted">Los demás usuarios podrán verla, reaccionar y comentar.</p><div class="points" style="margin:20px 0"><div class="number">${state.points} <small>raíces</small></div><small>Puntos autorizados por el servidor</small></div></div><div style="margin-top:19px">${btn('Ver el muro de la comunidad','home')}</div>`,'home')}
 function liveGroups(){return wrap(`${header('Grupos de Lurín','home')}<div class="eyebrow">COMUNIDADES REALES</div><h1 class="big">Encuentra a tu gente.</h1><p class="small muted">Los mensajes se comparten con otros miembros conectados.</p>${[...roomsBySlug].map(([slug,x])=>`<button class="card padded row" data-live="openRoom" data-id="${h(slug)}" style="width:100%;margin:12px 0;text-align:left"><div class="avatar gold">${I('users',24)}</div><div style="flex:1"><b>${h(x.title)}</b><p class="tiny muted">${h(x.description)}</p></div>${I('chevron')}</button>`).join('')||'<p>No hay grupos públicos disponibles.</p>'}`,'home')}
 function liveChat(){const room=roomsBySlug.get(state.room);return wrap(`${header(room?.title||'Conversación','groups')}<p class="small muted">Sala compartida · Sé amable con la comunidad</p><div style="padding:15px 0 95px">${chat.map(m=>`<div class="message ${m.author_id===sessionUser()?'me':''}"><b class="tiny">${h(m.author)}</b><div style="margin-top:5px">${h(m.body)}</div></div>`).join('')||'<p class="muted small">Todavía no hay mensajes. Saluda a los demás.</p>'}</div><div class="compose-chat"><input id="liveChatText" maxlength="1000" placeholder="Escribe un mensaje..." aria-label="Mensaje"><button data-live="sendChat" ${busy?'disabled':''}>${I('send')}</button></div>`,'home')}
 function liveWallet(){return wrap(`${header('Mis raíces','home')}<div class="points" style="margin:10px 0"><small>PUNTOS AUTORIZADOS POR LA COMUNIDAD</small><div class="number">${state.points} <small>raíces</small></div></div><div class="card padded"><h2>Cómo ganar</h2><p class="small">+30 por publicación (máximo 3 al día).</p><p class="small">+5 por comentario útil de 20 caracteres o más en publicaciones ajenas (máximo 5 al día).</p><p class="small muted">El servidor registra los puntos. No se pueden editar desde el teléfono.</p></div><div class="section-row"><h2>Últimos movimientos</h2></div><div class="card padded">${state.history.slice(0,10).map(i=>`<div class="row between" style="margin:8px 0"><span class="small">${h(i.label)}</span><b>${i.pts>0?'+':''}${i.pts}</b></div>`).join('')||'<p class="small muted">Aún no tienes movimientos.</p>'}</div><div style="margin-top:14px">${btn('Ranking de la comunidad','rankGo')}</div><div style="margin-top:9px">${btn('Ver futuras recompensas','rewardsGo')}</div>`,'wallet')}
 function liveRanking(){return wrap(`${header('Ranking comunitario','wallet')}<div class="eyebrow">HISTORIAS COMPARTIDAS</div><h1 class="big">Las raíces que crecen juntas</h1><div class="card padded" style="margin-top:15px">${leaderboard.length?leaderboard.map((x,i)=>`<div class="row between" style="margin:12px 0"><div class="row"><b style="min-width:25px">${i+1}.</b><div class="avatar blue">${h(x.display_name).slice(0,2).toUpperCase()}</div><b class="small">${h(x.display_name)}</b></div><span class="points-tag">${Number(x.total_points)} raíces</span></div>`).join(''):'<p class="muted small">Todavía no hay participantes.</p>'}</div><p class="info-note">El ranking refleja puntos reales autorizados por el servidor, no la audiencia ficticia del prototipo.</p>`,'challenges')}
 function liveRewards(){return wrap(`${header('Recompensas','wallet')}<div class="eyebrow">FUTUROS BENEFICIOS</div><h1 class="big">Tus raíces podrán convertirse en experiencias.</h1><div class="card padded"><p class="small">Aquí habrá descuentos, rutas culturales y experiencias con comercios aliados una vez que existan acuerdos verificables.</p><p class="small muted">No hay premios canjeables ni cupones válidos en esta beta comunitaria.</p></div>`,'wallet')}
 function liveProfile(){return wrap(`${header('Mi perfil','home')}<div class="card padded" style="text-align:center;margin-top:12px"><div class="avatar gold" style="width:75px;height:75px;margin:auto;font-size:27px">${h(state.nickname).slice(0,1).toUpperCase()}</div><h1 class="big">${h(state.nickname)}</h1><span class="small-pill">Usuario registrado</span><div class="grid2"><div><h2>${state.points}</h2><span class="tiny">Raíces</span></div><div><h2>${state.userPosts.length}</h2><span class="tiny">Publicaciones</span></div></div></div><div style="margin-top:15px">${btn('Mi comunidad de grupos','groupsGo')}</div><div style="margin-top:10px">${btn('Cerrar sesión','logout')}</div>`,'profile')}
 function liveSettings(){return wrap(`${header('Privacidad y seguridad','profile')}<div class="card padded"><b>Identidad pública</b><p class="small muted">Tu nombre público y publicaciones se muestran a otros usuarios.</p><b>Reportar contenido</b><p class="small muted">Utiliza "Reportar" en cualquier publicación para enviar un reporte de abuso.</p><b>Datos</b><p class="small muted">La sesión permanece solo en este dispositivo. Puedes cerrarla cuando desees.</p></div><div style="margin-top:13px">${btn('Cerrar sesión','logout')}</div>`,'profile')}
 function liveChallenges(){return wrap(`${header('Retos','home')}<div class="eyebrow">COMPETENCIAS Y ACTIVIDADES</div><h1 class="big">Tu creatividad cuenta.</h1><p class="small muted">Participa en retos comunitarios. Los aportes se revisan antes de otorgar premios.</p>${activeChallenges.length?activeChallenges.map(ch=>`<div class="card padded" style="margin:12px 0"><b>${h(ch.title)}</b><p class="small muted">${h(ch.description)}</p><span class="small-pill gold">${Number(ch.reward_points)||0} posibles raíces</span><div style="margin-top:12px"><button class="primary" data-live="openChallenge" data-id="${h(ch.id)}">Ver reto</button></div></div>`).join(''):'<div class="card padded">Aún no hay retos abiertos. Vuelve pronto.</div>'}<div style="margin-top:15px">${btn('Ver ranking','rankGo')}</div>`,'challenges')}
 function liveChallengeDetail(){const ch=activeChallenges.find(x=>x.id===state.challenge);return wrap(`${header('Reto comunitario','challenges')}<h1 class="big">${h(ch?.title||'Reto no disponible')}</h1><p class="small">${h(ch?.description||'')}</p><div class="card padded"><b>Reglas</b><p class="small muted">Publica contenido original y respetuoso. Las pruebas se revisan antes de aprobarlas.</p></div><div style="margin-top:15px">${ch?btn('Participar en el reto','challengeGo'):''}</div>`,'challenges')}
 function liveSubmitChallenge(){return wrap(`${header('Participar','challenges')}<h1 class="big">Cuéntanos tu aporte</h1><div class="card padded"><label class="field-label">Descripción</label><textarea class="field" id="liveChallengeText" rows="5" maxlength="800" placeholder="Describe tu participación (mínimo 20 caracteres)"></textarea><p class="hint">La validación del reto es manual.</p>${btn('Enviar para revisión','sendChallenge')}</div>`,'challenges')}
 function liveChallengeDone(){return wrap(`${header('Participación enviada','challenges')}<h1 class="big">¡Gracias por participar!</h1><p class="small muted">Tu aporte está pendiente de revisión. Los puntos no se acreditan automáticamente.</p><div style="margin-top:16px">${btn('Volver a retos','challengesGo')}</div>`,'challenges')}
 function liveEvents(){return wrap(`${header('Eventos locales','home')}<h1 class="big">Experiencias para vivir en comunidad</h1><p class="small muted">Solo actividades publicadas por organizadores, con fecha y zona.</p>${events.length?events.map(e=>`<div class="card padded" style="margin:13px 0"><span class="small-pill gold">${h(new Date(e.starts_at).toLocaleDateString('es-PE',{day:'numeric',month:'long'}))}</span><h2>${h(e.title)}</h2><p class="small muted">${h(e.description)}</p><div class="row between"><span class="tiny">${h(e.zone)}</span><button data-live="toggleEvent" data-id="${h(e.id)}" class="primary" style="width:auto;padding:11px 13px">${myEventIds.has(e.id)?'Cancelar asistencia':'Me apunto'}</button></div></div>`).join(''):'<div class="card padded"><p class="small">Aún no hay eventos confirmados. Cuando existan aparecerán aquí, sin fechas inventadas.</p></div>'}<p class="info-note">La inscripción indica interés, no garantiza entradas ni reservas. Confirma siempre con el organizador.</p>`,'home')}

 function liveNotifications(){return wrap(`${header('Actividad','home')}<p class="small muted">Las publicaciones y mensajes nuevos aparecen al sincronizar. Las notificaciones del sistema se implementarán en una fase posterior.</p>`,'home')}
 function liveReport(){return wrap(`${header('Reportar contenido','home')}<h1 class="big">Ayúdanos a cuidar Lurín</h1><div class="card padded"><label class="field-label">Motivo</label><textarea id="liveReportText" class="field" rows="4" maxlength="700" placeholder="Describe por qué esta publicación infringe las normas..."></textarea><div style="margin-top:10px">${btn('Enviar reporte','submitReport')}</div></div>`,'home')}

 const origWelcome=views.welcome;
 Object.assign(views,{
  welcome:liveWelcome,role:liveWelcome,home:liveHome,post:liveDetail,comments:liveComments,compose:liveCompose,published:livePublished,
  groups:liveGroups,chat:liveChat,wallet:liveWallet,ranking:liveRanking,rewards:liveRewards,reward:liveRewards,voucher:liveRewards,
  profile:liveProfile,settings:liveSettings,challenges:liveChallenges,challengeDetail:liveChallengeDetail,
  submitChallenge:liveSubmitChallenge,challengeDone:liveChallengeDone,events:liveEvents,event:liveEvents,notifications:liveNotifications,report:liveReport
 });

 async function onNavigation(page){
   if(!sessionUser())return;
   if(['home','post','profile'].includes(page))await loadFeed({quiet:true});
   if(page==='comments')await loadComments(state.postId);
   if(page==='chat')await loadMessages(state.room);
   if(page==='groups')await loadRooms();
   if(['wallet','ranking','profile','published'].includes(page))await refreshPoints();
   if(page==='challenges')await loadChallenges();
   if(page==='events')await loadEvents();
   if(['wallet','ranking','profile','groups','comments','chat','challenges'].includes(page))render();
 }

 async function perform(action,el){
   if(busy&&action!=='refresh')return;
   const id=el?.dataset?.id;
   try{
     switch(action){
     case 'toggleAuth':authMode=authMode==='login'?'register':'login';authNotice='';render();break;
     case 'auth':{
       if(authBusy)return;const email=String(document.getElementById('liveEmail')?.value||'').trim().toLowerCase();
       const pw=String(document.getElementById('livePassword')?.value||'');signupDisplayName=String(document.getElementById('liveName')?.value||'').trim();
       if(!/^\S+@\S+\.\S+$/.test(email)||pw.length<6)throw Error('Ingresa un correo válido y una contraseña de 6 caracteres o más.');
       if(authMode==='register'&&signupDisplayName.length<2)throw Error('Escribe el nombre que verá la comunidad.');
       authBusy=true;let ok=await auth(email,pw,authMode==='register',signupDisplayName);authBusy=false;
       if(ok){await ensureProfile();state.page='home';render();await Promise.all([loadFeed(),loadRooms(),refreshPoints()]);}
       else render();break;
     }
     case 'logout':{
       const token=session?.access_token;setSession(null);feed=[];comments=[];chat=[];profiles.clear();state.userPosts=[];state.points=0;
       if(token){fetch(url+'/auth/v1/logout',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token}}).catch(()=>{});}
       state.page='welcome';render();break;
     }
     case 'refresh':await Promise.all([loadFeed(),refreshPoints()]);announce('Publicaciones actualizadas.');break;
     case 'filterFeed':feedView=el?.dataset?.value==='following'?'following':'all';render();break;
     case 'follow':{
       if(!guardAuth())break;const target=id;
       if(!/^[0-9a-f-]{36}$/.test(String(target||''))||target===sessionUser())throw Error('Perfil inválido.');
       if(followingIds.has(target))await deleteWhere('lurin_follows',{follower_id:'eq.'+sessionUser(),followed_id:'eq.'+target});
       else await post('lurin_follows',{follower_id:sessionUser(),followed_id:target});
       await loadFeed({quiet:true});render();break;
     }
     case 'toggleEvent':{
       if(!guardAuth())break;const event=events.find(e=>e.id===id);
       if(!event)throw Error('El evento no está disponible.');
       if(myEventIds.has(id))await deleteWhere('lurin_event_attendees',{event_id:'eq.'+id,user_id:'eq.'+sessionUser()});
       else await post('lurin_event_attendees',{event_id:id,user_id:sessionUser()});
       await loadEvents();announce(myEventIds.has(id)?'Asistencia anotada.':'Asistencia cancelada.');break;
     }
     case 'publish':{
       if(!guardAuth())break;
       const title=maxText(document.getElementById('liveTitle')?.value,140),body=maxText(document.getElementById('liveBody')?.value,3500);
       const category=document.getElementById('liveCategory')?.value||'historia';
       if(title.length<6||body.length<15)throw Error('Escribe un título de 6 caracteres y una historia de al menos 15.');
       if(!['historia','foto','tradicion','recomendacion'].includes(category))throw Error('Categoría inválida.');
       busy=true;let photo=null;
       try{if(mediaFile)photo=await uploadPhoto(mediaFile);
         const rows=await post('lurin_posts',{author_id:sessionUser(),title,body,category,image_path:photo});
         mediaFile=null;photoPreview='';state.postId=rows[0]?.id||'';state.page='published';render();
         await Promise.all([loadFeed(),refreshPoints()]);
       }catch(err){if(photo)await discardPhoto(photo);throw err;}finally{busy=false;}break;
     }
     case 'comments':state.postId=id;comments=[];go('comments');await loadComments(id);break;
     case 'sendComment':{
       const body=maxText(document.getElementById('liveComment')?.value,600);
       if(body.length<2||!state.postId)throw Error('Escribe un comentario válido.');
       busy=true;await post('lurin_comments',{post_id:state.postId,author_id:sessionUser(),body});busy=false;
       await Promise.all([loadComments(state.postId),loadFeed({quiet:true}),refreshPoints()]);announce('Comentario publicado para todos.');break;
     }
     case 'like':{
       const already=likedIds.has(id);
       if(already)await deleteWhere('lurin_likes',{post_id:'eq.'+id,author_id:'eq.'+sessionUser()});
       else await post('lurin_likes',{post_id:id,author_id:sessionUser()});
       await loadFeed({quiet:true});break;
     }
     case 'delete':{
       if(!confirm('¿Eliminar tu publicación?'))break;
       await deleteWhere('lurin_posts',{id:'eq.'+id,author_id:'eq.'+sessionUser()});
       await loadFeed();announce('Publicación eliminada.');break;
     }
     case 'share':{
       const p=feed.find(x=>x.id===id);if(!p)return;
       const txt=`${p.title} · Compartido en Lurín Comunidad. Descubre nuestras raíces.`;
       if(window.LurinAndroid?.shareText)window.LurinAndroid.shareText(txt);
       else if(navigator.share)await navigator.share({title:p.title,text:txt});
       else {await navigator.clipboard.writeText(txt);announce('Texto copiado.');}break;
     }
     case 'report':state.reportPost=id;go('report');break;
     case 'submitReport':{
       const reason=maxText(document.getElementById('liveReportText')?.value,700);
       if(reason.length<10)throw Error('Describe el motivo con al menos 10 caracteres.');
       await post('lurin_reports',{reporter_id:sessionUser(),post_id:state.reportPost,reason});
       announce('Gracias. Tu reporte fue enviado.');go('home');break;
     }
     case 'openRoom':state.room=id;chat=[];await joinRoom(id);go('chat');await loadMessages(id);break;
     case 'sendChat':{
       const msg=maxText(document.getElementById('liveChatText')?.value,1000);if(!msg)throw Error('Escribe un mensaje.');
       const room=roomsBySlug.get(state.room);if(!room)throw Error('Grupo no disponible.');
       busy=true;await post('lurin_messages',{room_id:room.id,author_id:sessionUser(),body:msg});busy=false;
       await loadMessages(state.room);break;
     }
     case 'rankGo':go('ranking');break;
     case 'rewardsGo':go('rewards');break;
     case 'groupsGo':go('groups');break;
     case 'challengesGo':go('challenges');break;
     case 'openChallenge':state.challenge=id;go('challengeDetail');break;
     case 'challengeGo':go('submitChallenge');break;
     case 'sendChallenge':{
       const desc=maxText(document.getElementById('liveChallengeText')?.value,800);
       if(desc.length<20)throw Error('Describe la participación con al menos 20 caracteres.');
       await post('lurin_challenge_submissions',{challenge_id:state.challenge,author_id:sessionUser(),description:desc});
       go('challengeDone');break;
     }
     default:break;
     }
   }catch(err){authBusy=false;busy=false;pubError(err);}
 }

 document.addEventListener('click',ev=>{
   const a=ev.target.closest('[data-live]');if(!a)return;
   ev.preventDefault();ev.stopImmediatePropagation();void perform(a.dataset.live,a);
 },true);
 document.addEventListener('change',ev=>{
   if(ev.target.id!=='livePhotoFile')return;
   const file=ev.target.files?.[0];if(!file)return;
   if(file.size>8*1024*1024){announce('Foto demasiado grande (máximo 8 MB).');return;}
   if(photoPreview)URL.revokeObjectURL(photoPreview);
   mediaFile=file;photoPreview=URL.createObjectURL(file);render();
 });
 const originalGo=go;
 window.go=function(page){
   if(!sessionUser()&&!['welcome','role'].includes(page)){state.page='welcome';render();return;}
   originalGo(page);void onNavigation(page).catch(pubError);
 };
 // Named hooks for Android lifecycle and cross-device QA.
 const api={enabled:true,refresh:async()=>{await Promise.all([loadFeed(),refreshPoints()]);},onResume:async()=>{
   if(sessionUser())await Promise.all([loadFeed({quiet:true}),refreshPoints(),state.page==='chat'?loadMessages(state.room):Promise.resolve()]);
 },get userId(){return sessionUser()},get postCount(){return feed.length},get posts(){return feed.map(x=>({id:x.id,title:x.title}))}};
 window.LurinLive=api;

 async function initialize(){
   state.online=true;state.userPosts=[];state.points=0;state.history=[];
   state.page='welcome';render();
   try{const saved=JSON.parse(localStorage.getItem(sessionKey)||'null');if(saved?.refresh_token){setSession(saved);
      await jwt();await ensureProfile();state.page='home';render();
      await Promise.all([loadFeed({quiet:true}),loadRooms(),refreshPoints(),loadChallenges()]);
   }}catch(err){setSession(null);authNotice='Inicia sesión para sincronizar tu comunidad.';state.page='welcome';render();}
   if(!timer){timer=setInterval(()=>{if(!sessionUser()||document.visibilityState==='hidden')return;
      if(['home','profile','post','comments'].includes(state.page))void loadFeed({quiet:true});
      if(state.page==='comments')void loadComments(state.postId);
      if(state.page==='chat')void loadMessages(state.room).catch(()=>{});
   },6000);}
 }
 void initialize();
})();
