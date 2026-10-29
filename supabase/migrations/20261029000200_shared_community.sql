-- LURÍN COMUNIDAD v0.3: interacciones entre usuarios reales.
-- Aplicar SOLO en un proyecto Supabase NUEVO y EXCLUSIVO de Lurín.
-- Requiere primero 20261029000100_lurin_comunidad_independiente.sql.
-- Las ofertas, promociones y canjes COMERCIALES permanecen desactivados.

-- Publicaciones: se visualizan inmediatamente para el resto de la comunidad.
ALTER TABLE public.lurin_posts ALTER COLUMN state SET DEFAULT 'published';
DROP POLICY IF EXISTS "submit own post pending moderation" ON public.lurin_posts;
CREATE POLICY "publish self" ON public.lurin_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT auth.uid()) AND state = 'published');
GRANT DELETE ON public.lurin_posts TO authenticated;
CREATE POLICY "delete own post" ON public.lurin_posts FOR DELETE TO authenticated
  USING (author_id = (SELECT auth.uid()));

-- La foto de una publicación debe estar dentro de la carpeta del propietario.
ALTER TABLE public.lurin_posts ADD CONSTRAINT lurin_post_image_ownership
 CHECK (image_path IS NULL OR left(image_path, length(author_id::text) + 1) = author_id::text || '/');

-- Espacios de conversación compartidos: id estable, no nombres de usuarios de demostración.
ALTER TABLE public.lurin_rooms ADD COLUMN IF NOT EXISTS slug text UNIQUE;
INSERT INTO public.lurin_rooms (title,description,is_public,slug) VALUES
 ('Historias que nos unen','Memoria colectiva, familia y tradiciones de Lurín',true,'memorias'),
 ('Exploradores de Lurín','Rutas, experiencias y consejos para visitantes',true,'explora'),
 ('Mesa lurinense','Gastronomía y emprendimientos locales',true,'sabores')
ON CONFLICT (slug) DO NOTHING;

-- Los points los entrega SOLO el servidor (nunca el cliente).
CREATE UNIQUE INDEX IF NOT EXISTS lurin_ledger_idempotent
 ON public.lurin_point_ledger(user_id,reason,source_event) WHERE source_event IS NOT NULL;

CREATE OR REPLACE FUNCTION public.lurin_points_post_trigger()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  -- Serializar las publicaciones del mismo perfil, evitando superar el límite diario.
  PERFORM 1 FROM public.lurin_profiles WHERE id=NEW.author_id FOR UPDATE;
  IF NEW.state = 'published' AND
     (SELECT count(*) FROM public.lurin_point_ledger
       WHERE user_id = NEW.author_id AND reason='publicacion'
         AND created_at >= date_trunc('day', now())) < 3 THEN
    INSERT INTO public.lurin_point_ledger(user_id,amount,reason,source_event)
    VALUES(NEW.author_id,30,'publicacion',NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.lurin_points_post_trigger() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS tr_lurin_post_points ON public.lurin_posts;
CREATE TRIGGER tr_lurin_post_points AFTER INSERT ON public.lurin_posts
 FOR EACH ROW EXECUTE FUNCTION public.lurin_points_post_trigger();

CREATE OR REPLACE FUNCTION public.lurin_points_comment_trigger()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE post_owner uuid;
BEGIN
  PERFORM 1 FROM public.lurin_profiles WHERE id=NEW.author_id FOR UPDATE;
  SELECT author_id INTO post_owner FROM public.lurin_posts WHERE id=NEW.post_id AND state='published';
  IF post_owner IS NOT NULL AND post_owner <> NEW.author_id
    AND char_length(NEW.body) >= 20
    AND (SELECT count(*) FROM public.lurin_point_ledger
      WHERE user_id = NEW.author_id AND reason='comentario_util'
        AND created_at >= date_trunc('day', now())) < 5 THEN
      INSERT INTO public.lurin_point_ledger(user_id,amount,reason,source_event)
      VALUES (NEW.author_id,5,'comentario_util',NEW.id)
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.lurin_points_comment_trigger() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS tr_lurin_comment_points ON public.lurin_comments;
CREATE TRIGGER tr_lurin_comment_points AFTER INSERT ON public.lurin_comments
 FOR EACH ROW EXECUTE FUNCTION public.lurin_points_comment_trigger();

-- Límites de uso para una beta pública. No sustituyen un servicio anti-spam.
CREATE OR REPLACE FUNCTION public.lurin_limit_posting()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
 PERFORM 1 FROM public.lurin_profiles WHERE id=NEW.author_id FOR UPDATE;
 IF (SELECT count(*) FROM public.lurin_posts WHERE author_id=NEW.author_id
      AND created_at >= now()-interval '24 hours') >= 8 THEN
   RAISE EXCEPTION 'Límite de 8 publicaciones por día alcanzado';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.lurin_limit_posting() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS tr_lurin_post_limit ON public.lurin_posts;
CREATE TRIGGER tr_lurin_post_limit BEFORE INSERT ON public.lurin_posts
 FOR EACH ROW EXECUTE FUNCTION public.lurin_limit_posting();

CREATE OR REPLACE FUNCTION public.lurin_limit_comments()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
 PERFORM 1 FROM public.lurin_profiles WHERE id=NEW.author_id FOR UPDATE;
 IF (SELECT count(*) FROM public.lurin_comments WHERE author_id=NEW.author_id
      AND created_at >= now()-interval '1 hour') >= 20 THEN
   RAISE EXCEPTION 'Límite de comentarios por hora alcanzado';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.lurin_limit_comments() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS tr_lurin_comment_limit ON public.lurin_comments;
CREATE TRIGGER tr_lurin_comment_limit BEFORE INSERT ON public.lurin_comments
 FOR EACH ROW EXECUTE FUNCTION public.lurin_limit_comments();

-- Reportes: contenido inapropiado a revisión, no exponer entre usuarios.
CREATE INDEX IF NOT EXISTS lurin_reports_post ON public.lurin_reports(post_id,created_at);

-- Galería compartida de fotos. Solo cada usuario puede subir dentro de /<user_id>/.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('lurin-fotos','lurin-fotos',true,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET
 file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
CREATE POLICY "lurin fotos read public" ON storage.objects
 FOR SELECT TO anon,authenticated USING(bucket_id='lurin-fotos');
CREATE POLICY "lurin fotos upload own folder" ON storage.objects
 FOR INSERT TO authenticated WITH CHECK (
   bucket_id='lurin-fotos'
   AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
   AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp')
 );
CREATE POLICY "lurin fotos delete own folder" ON storage.objects
 FOR DELETE TO authenticated USING (
  bucket_id='lurin-fotos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
 );

-- Realtime: las suscripciones respetarán las RLS de estas tablas.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
   IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='lurin_posts') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.lurin_posts;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='lurin_comments') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.lurin_comments;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='lurin_likes') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.lurin_likes;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='lurin_messages') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.lurin_messages;
   END IF;
 END IF;
END $$;

-- No GRANT INSERT en el ledger, ni UPDATE en las tablas de recompensas.
-- Canjes comerciales requieren contratos, antifraude, revisión humana y un RPC de servidor.

-- Ranking público: únicamente perfil visible + suma de puntos, sin exponer el historial privado.
-- Función privilegiada de solo lectura, sin parámetros ni SQL dinámico.
CREATE OR REPLACE FUNCTION public.lurin_top_raices()
RETURNS TABLE(user_id uuid, display_name text, total_points bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT p.id, p.display_name, COALESCE(SUM(l.amount),0)::bigint
 FROM public.lurin_profiles p
 LEFT JOIN public.lurin_point_ledger l ON l.user_id=p.id
 WHERE auth.uid() IS NOT NULL
 GROUP BY p.id,p.display_name
 ORDER BY COALESCE(SUM(l.amount),0) DESC, p.display_name ASC
 LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.lurin_top_raices() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lurin_top_raices() TO authenticated;

-- Saldo total personal, sin truncamiento por top 50 del ranking.
CREATE OR REPLACE FUNCTION public.lurin_my_points()
RETURNS bigint LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
 SELECT COALESCE(SUM(amount),0)::bigint FROM public.lurin_point_ledger
 WHERE user_id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION public.lurin_my_points() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lurin_my_points() TO authenticated;
