/* Android UI v0.7: independent enhancement inside the existing live-community IIFE.
 * Restores the original welcome -> visitor role flow, adds honest example content,
 * reward previews and challenge proof uploads while keeping real Supabase posts and comments.
 */
let challengeFile=null,challengePreview='';
 const sampleStories=[
  {id:'santuario',name:'Lucía R. · personaje de ejemplo',title:'Una historia que escuché de mi abuela',copy:'Los paseos al Santuario nos recuerdan que Lurín conserva memorias de muchas generaciones. ¿Qué historia te contaron en casa?',image:'pachacamac.jpg',place:'Patrimonio de Lurín',comments:['Mi familia recuerda mucho este lugar.','Me encanta conocer los relatos de nuestros abuelos.']},
  {id:'valle',name:'Mateo V. · personaje de ejemplo',title:'El valle después de la neblina',copy:'Las lomas y caminos muestran la naturaleza que queremos conservar. Comparte tu rincón favorito sin revelar lugares privados.',image:'valle.jpg',place:'Naturaleza de Lurín',comments:['Un paisaje para volver a visitar.']},
  {id:'caballos',name:'Rosa C. · personaje de ejemplo',title:'Una tradición que merece seguir viva',copy:'Los caballos de paso forman parte de las experiencias culturales del valle. Así imaginamos una comunidad que comparte tradiciones.',image:'caballos.jpg',place:'Tradiciones de Lurín',comments:['Qué hermoso conocer nuestras costumbres.']}
 ];
 const rewardIdeas=[
  {id:'sabores',title:'Descuento en sabores de Lurín',category:'Gastronomía',cost:180,area:'Lurín Centro',provider:'Chicharronería aliada por confirmar',image:'turismo.jpg',detail:'Ejemplo de descuento del 10 % en un plato seleccionado. Pendiente de acuerdo, horarios, condiciones y validación.'},
  {id:'paseo',title:'Paseo con caballos de paso',category:'Experiencias',cost:650,area:'Valle de Lurín',provider:'Operador ecuestre por confirmar',image:'caballos.jpg',detail:'Ejemplo de experiencia guiada. Pendiente de convenio, medidas de seguridad, cupos y supervisión.'},
  {id:'ceramica',title:'Taller de artesanía local',category:'Cultura',cost:380,area:'Lurín y alrededores',provider:'Taller artesanal por confirmar',image:'alfareria.jpg',detail:'Ejemplo de taller introductorio para conocer el oficio artesanal. Pendiente de aliado y calendario.'},
  {id:'rutas',title:'Ruta cultural y natural',category:'Turismo',cost:420,area:'Rutas patrimoniales de Lurín',provider:'Guía cultural por confirmar',image:'pachacamac.jpg',detail:'Ejemplo de recorrido cultural. No representa una entrada gratuita a un recinto ni un servicio confirmado.'}
 ];
 let rewardIdeaId='sabores', sampleStoryId='santuario';
 function sampleCard(x){return `<article class="sample-story"><img src="${IMG(x.image)}" alt="Referencia visual de ${h(x.place)}"><div class="sample-inner"><span class="sample-label">HISTORIA DE EJEMPLO · NO PUBLICADA</span><h3>${h(x.title)}</h3><p>${h(x.copy)}</p><div class="row between" style="margin:10px 0"><span class="tiny muted">${h(x.name)}</span><span class="small-pill">${h(x.place)}</span></div><button data-v07="sampleStory" data-id="${x.id}" class="secondary" style="width:100%">Ver conversación de muestra</button></div></article>`;}
 function sampleDetail(){const x=sampleStories.find(v=>v.id===sampleStoryId)||sampleStories[0];return wrap(`${header('Historia de ejemplo','home')}<div class="sample-story"><img src="${IMG(x.image)}" class="wide-photo" alt="${h(x.place)}"><div class="sample-inner"><span class="sample-label">EJEMPLO FICTICIO · NO ES UN USUARIO REAL</span><h2>${h(x.title)}</h2><p>${h(x.copy)}</p></div></div><div class="section-row"><h2>Comentarios de ejemplo</h2></div>${x.comments.map(c=>`<div class="card padded" style="margin:9px 0;font-size:12px;line-height:1.5">${h(c)}</div>`).join('')}<p class="info-note">Las historias reales permiten comentar, reaccionar y seguir al autor. Estas publicaciones solo ilustran cómo funcionará la comunidad.</p><button type="button" class="primary" data-v07="startCompose">Publicar mi propia historia</button>`,'home');}
 function sampleRewardDetail(){const x=rewardIdeas.find(v=>v.id===rewardIdeaId)||rewardIdeas[0];return wrap(`${header('Recompensa propuesta','rewards')}<img class="wide-photo" src="${IMG(x.image)}" alt="${h(x.title)}"><div style="margin:17px 0 10px"><span class="sample-label">PROPUESTA · NO CANJEABLE</span><h1 class="big" style="margin-top:12px">${h(x.title)}</h1><p class="small muted">${h(x.area)} · ${h(x.provider)}</p></div><div class="card padded row between" style="margin-bottom:13px"><b class="small">Costo de referencia</b><span class="small-pill gold">${x.cost} raíces</span></div><div class="card padded"><b>Condiciones previstas</b><p class="small muted" style="line-height:1.65">${h(x.detail)}</p><p class="small muted">Los puntos tienen uso recreativo y no equivalen a dinero. No hay convenio ni cupón habilitado.</p></div><button class="secondary" style="width:100%;margin-top:14px" data-live="rewardsGo">Volver a recompensas</button>`,'wallet');}
 function liveRole(){return role().replace('data-go="home"','data-v07="enterGuest"').replace('Puedes cambiar tu perfil y privacidad después. No se publica tu ubicación exacta.','Puedes entrar sin correo. Tu sesión se guarda en este dispositivo; protégela con usuario y contraseña si deseas recuperarla en otro. <br><br><button type="button" data-v08="showUsername" class="link">Crear o entrar con usuario y contraseña</button><br><button type="button" data-v07="showEmailLogin" class="link">Ya tengo una cuenta con correo</button>');}
 function introLive(){return welcome().replace('Comunidad de Lurín · Conecta con tus raíces','Comunidad abierta · Historias, retos y recompensas propuestas');}

 function liveRewards(){return wrap(`${header('Recompensas','wallet')}<div class="eyebrow">PROPUESTAS DE ALIANZAS LOCALES</div><h1 class="big">Tus raíces podrían convertirse en experiencias.</h1><div class="points" style="margin:12px 0 17px"><small>RAÍCES GANADAS EN LA COMUNIDAD</small><div class="number">${Number(state.points)||0} <small>raíces</small></div></div><p class="info-note">Estos son ejemplos de premios: muestran una zona, un tipo de negocio y puntos de referencia. Ninguno está disponible para canjear hasta que existan convenios verificables.</p>${rewardIdeas.map(x=>`<div class="reward-showcase"><img src="${IMG(x.image)}" alt="Referencia de ${h(x.category)}"><div class="reward-info"><span class="sample-label">PROPUESTA SIN CONVENIO</span><strong>${h(x.title)}</strong><small>${h(x.area)} · ${h(x.provider)}</small><span class="small-pill gold" style="align-self:flex-start">${x.cost} raíces</span><button data-v07="rewardDetail" data-id="${x.id}">Ver condiciones</button></div></div>`).join('')}<p class="hint">Cuando se incorporen locales reales, cada canje indicará nombre del comercio, dirección, horarios, vigencia y validación.</p>`,'wallet');}
 function liveChallenges(){const visuals=['playa_caballos.jpg','pachacamac.jpg','alfareria.jpg','valle.jpg'];return wrap(`${header('Retos','home')}<div class="eyebrow">FOTOGRAFÍA · MEMORIAS · CULTURA</div><h1 class="big">Tu creatividad cuenta.</h1><p class="small muted">Comparte una fotografía o una historia original. Los puntos se otorgan únicamente después de revisar la participación.</p>${activeChallenges.length?activeChallenges.map((ch,i)=>`<article class="ch-card"><img class="ch-img" src="${IMG(visuals[i%visuals.length])}" alt="Reto creativo de la comunidad"><div class="ch-body"><span class="sample-label">RETO DE LA COMUNIDAD · EN REVISIÓN</span><h3>${h(ch.title)}</h3><p>${h(ch.description)}</p><div class="row between" style="margin:10px 0"><span class="small-pill gold">Hasta ${Number(ch.reward_points)||0} raíces</span><span class="tiny muted">Hasta ${h(new Date(ch.ends_at).toLocaleDateString('es-PE'))}</span></div><button data-live="openChallenge" data-id="${h(ch.id)}" class="primary">Participar</button></div></article>`).join(''):`<div class="card padded"><b>Retos de ejemplo mientras llegan nuevos concursos</b><p class="small muted">Ideas de actividades que la comunidad podrá realizar cuando los organizadores publiquen convocatorias.</p></div>${[['Foto de un rincón de Lurín','Toma una fotografía original del valle o de una tradición.','playa_caballos.jpg','50'],['Historia de nuestros abuelos','Cuenta un recuerdo familiar de Lurín con permiso.','pachacamac.jpg','75'],['Sabores que nos unen','Comparte una receta o tradición gastronómica local.','turismo.jpg','60']].map(([a,b,c,d])=>`<article class="ch-card"><img class="ch-img" src="${IMG(c)}"><div class="ch-body"><span class="sample-label">IDEA DE RETO · NO ABIERTO</span><h3>${a}</h3><p>${b}</p><span class="small-pill gold">${d} raíces de referencia</span><p class="hint">Participación disponible cuando haya convocatoria.</p></div></article>`).join('')}`}<div style="margin-top:15px">${btn('Ver ranking','rankGo')}</div>`,'challenges');}
 function liveChallengeDetail(){const ch=activeChallenges.find(x=>x.id===state.challenge);return wrap(`${header('Reto comunitario','challenges')}<img class="wide-photo" src="${IMG('playa_caballos.jpg')}" alt="Tradiciones y paisajes de Lurín"><div class="eyebrow" style="margin-top:16px">RETO CREATIVO DE LA COMUNIDAD</div><h1 class="big">${h(ch?.title||'Reto no disponible')}</h1><p class="small muted" style="line-height:1.6">${h(ch?.description||'')}</p><div class="card padded row between"><span class="small bold">Premio tras aprobación</span><span class="small-pill gold">${Number(ch?.reward_points||0)} raíces</span></div><div class="card padded" style="margin-top:13px"><b class="small">Cómo participar</b><p class="small muted" style="line-height:1.6">1. Comparte una historia propia y, si corresponde, una fotografía. <br>2. Envía tu participación para revisión. <br>3. Recibirás puntos solo si una persona responsable aprueba la evidencia.</p></div><p class="info-note" style="margin-top:12px">El reto forma parte de la app piloto. Los puntos no garantizan descuentos comerciales.</p><div style="margin-top:15px">${ch?btn('Participar en el reto','challengeGo'):''}</div>`,'challenges')}
 function liveSubmitChallenge(){return wrap(`${header('Participar','challenges')}<h1 class="big">Cuéntanos tu aporte</h1><div class="card padded"><label class="field-label">Descripción</label><textarea class="field" id="liveChallengeText" rows="5" maxlength="800" placeholder="Describe tu participación (mínimo 20 caracteres)"></textarea><label class="field-label">Foto de tu participación (opcional, según reto)</label><input class="field" type="file" id="liveChallengePhoto" accept="image/jpeg,image/png,image/webp">${challengePreview?`<img src="${challengePreview}" alt="Vista previa de evidencia" style="width:100%;max-height:170px;object-fit:cover;margin:10px 0;border-radius:12px">`:''}<p class="hint">Tu participación se revisará antes de sumar puntos. No publiques fotos privadas de otras personas sin permiso.</p>${btn('Enviar para revisión','sendChallenge')}</div>`,'challenges')}

const v06LoginView=views.welcome;
const v06HomeView=views.home;
views.welcome=introLive;
views.role=liveRole;
views.login=v06LoginView; // Optional account recovery, not required on opening.
views.home=function(){
 const view=v06HomeView();
 if(feed.length!==0||feedView!=='all')return view;
 const empty='<div class="card padded"><b>La comunidad está empezando</b><p class="small muted">Todavía no hay publicaciones compartidas. Sé la primera persona en contar una historia.</p></div>';
 return view.replace(empty,`<div class="info-note" style="margin-bottom:10px"><b>Historias para inspirarte</b> · Ejemplos ficticios que muestran cómo se verá el muro. Las publicaciones reales aparecerán aquí cuando los vecinos participen.</div>${sampleStories.map(sampleCard).join('')}`);
};
views.samplePost=sampleDetail;
views.rewards=liveRewards;
views.reward=sampleRewardDetail;
views.challenges=liveChallenges;
views.challengeDetail=liveChallengeDetail;
views.submitChallenge=()=>liveSubmitChallenge().replace('data-live="sendChallenge"','data-v07="sendChallenge"');
const v06ProfileView=views.profile;
views.profile=()=>v06ProfileView().replace('Usuario registrado',session?.user?.is_anonymous?'Visitante sin correo · este dispositivo':'Miembro de Lurín');

async function actionV07(action,element){
 try{
  const id=element?.dataset?.id||'';
  switch(action){
   case 'showEmailLogin':state.page='login';render();break;
   case 'sampleStory':sampleStoryId=id;go('samplePost');break;
   case 'startCompose':go('compose');break;
   case 'rewardDetail':rewardIdeaId=id;go('reward');break;
   case 'enterGuest':{
     if(authBusy)return;
     const displayName=maxText(document.getElementById('nickname')?.value,60);
     if(displayName.length<2)throw Error('Escribe tu nombre o apodo para participar.');
     signupDisplayName=displayName;state.nickname=displayName;authBusy=true;
     try{
       // Edge function Lurín creates a real GoTrue identity without user email or Anonymous Sign-Ins.
       const response=await request('/functions/v1/lurin-identity',{method:'POST',body:{action:'guest',displayName},auth:false});
       if(!response?.access_token||!response?.user?.id)throw Error('No se pudo abrir tu cuenta de visitante. Revisa tu conexión.');
       setSession(response);await ensureProfile();state.page='home';render();
       await Promise.all([loadFeed({quiet:true}),loadRooms(),refreshPoints(),loadChallenges()]);
     }finally{authBusy=false;}
     break;
   }
   case 'sendChallenge':{
     const desc=maxText(document.getElementById('liveChallengeText')?.value,800);
     if(desc.length<20)throw Error('Describe la participación con al menos 20 caracteres.');
     const ch=activeChallenges.find(x=>x.id===state.challenge);
     if(!ch)throw Error('Este reto ya no está disponible.');
     if(new Date(ch.starts_at).getTime()>Date.now()||new Date(ch.ends_at).getTime()<Date.now())throw Error('Este reto está fuera de la convocatoria.');
     if(/foto|postal|paisaje/i.test(ch.title)&&!challengeFile)throw Error('Este reto necesita una fotografía propia.');
     busy=true;let photo=null;
     try{
       if(challengeFile)photo=await uploadPhoto(challengeFile);
       await post('lurin_challenge_submissions',{challenge_id:ch.id,author_id:sessionUser(),description:desc,photo_path:photo});
       challengeFile=null;if(challengePreview)URL.revokeObjectURL(challengePreview);challengePreview='';
       go('challengeDone');
     }catch(error){if(photo)await discardPhoto(photo);throw error;}
     finally{busy=false;}
     break;
   }
  }
 }catch(error){authBusy=false;busy=false;pubError(error);}
}
// Attribute namespace avoids intercepting any existing live_community listeners.
document.addEventListener('click',ev=>{
 const action=ev.target.closest('[data-v07]');
 if(!action)return;
 ev.preventDefault();ev.stopImmediatePropagation();void actionV07(action.dataset.v07,action);
},true);
document.addEventListener('change',ev=>{
 if(ev.target.id!=='liveChallengePhoto')return;
 const f=ev.target.files?.[0];if(!f)return;
 if(!f.type.startsWith('image/')||f.size>8*1024*1024){announce('Usa una foto de menos de 8 MB.');return;}
 if(challengePreview)URL.revokeObjectURL(challengePreview);
 challengeFile=f;challengePreview=URL.createObjectURL(f);
 // No recrear el formulario: conservar la historia escrita al elegir fotografía.
 const oldPreview=document.getElementById('lurinChallengePhotoPreview');
 if(oldPreview)oldPreview.remove();
 const preview=document.createElement('img');
 preview.id='lurinChallengePhotoPreview';preview.src=challengePreview;
 preview.alt='Vista previa de tu fotografía para el reto';
 preview.style.cssText='width:100%;max-height:180px;object-fit:cover;margin:10px 0;border-radius:12px';
 ev.target.insertAdjacentElement('afterend',preview);
});
// Keep unauthenticated navigation limited; the email-login view is separately available.
const v06Go=window.go;
window.go=function(page){if(page==='login'&&!sessionUser()){state.page='login';render();return;}v06Go(page);};
