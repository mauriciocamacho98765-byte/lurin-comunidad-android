-- Retos comunitarios de la app (no eventos comerciales). Revisión humana obligatoria.
-- Idempotente para facilitar entornos nuevos; no inserta publicaciones ni perfiles ficticios.
insert into public.lurin_challenges(title,description,starts_at,ends_at,reward_points,active)
select 'Postales de nuestras raíces',
       'Comparte una fotografía original de un paisaje, oficio o tradición de Lurín. Explica qué significa para ti. No ingreses a zonas restringidas ni publiques rostros sin permiso. La evidencia se revisa manualmente antes de otorgar puntos.',
       '2026-10-29 00:00:00-05','2027-02-28 23:59:59-05',50,true
where not exists(select 1 from public.lurin_challenges where title='Postales de nuestras raíces');

insert into public.lurin_challenges(title,description,starts_at,ends_at,reward_points,active)
select 'Relatos que nos unen',
       'Cuenta una historia familiar de Lurín, un recuerdo de tu barrio o el origen de una costumbre. Respeta la privacidad y solicita permiso antes de compartir testimonios. La participación requiere revisión manual.',
       '2026-10-29 00:00:00-05','2027-02-28 23:59:59-05',70,true
where not exists(select 1 from public.lurin_challenges where title='Relatos que nos unen');

insert into public.lurin_challenges(title,description,starts_at,ends_at,reward_points,active)
select 'Sabores con historia',
       'Presenta una receta o fotografía original de una preparación tradicional de Lurín y cuenta por qué es importante. No promociones comercios sin su permiso. La participación requiere revisión manual.',
       '2026-10-29 00:00:00-05','2027-02-28 23:59:59-05',45,true
where not exists(select 1 from public.lurin_challenges where title='Sabores con historia');
