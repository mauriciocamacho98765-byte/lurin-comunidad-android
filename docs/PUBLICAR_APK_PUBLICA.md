# Publicación controlada · Lurín Comunidad 0.6.0 beta

El repositorio GitHub puede ser **público**, pero el APK que se compile primero es una beta de depuración. Mantén el proyecto independiente de los dos repositorios privados.

## Ya preparado

- Logo a colores sólidos, sin tarjeta blanca de bienvenida.
- `pe.lurin.comunidad` exclusivo.
- Backend Supabase independiente preconfigurado con clave publicable y RLS.
- 18 tablas protegidas, servidor de puntos, fotos, mensajes, comentarios, likes y ranking.
- Build de APK automatizado con verificaciones de nombre de paquete, versión y firma; corrige un error de versión del verificador anterior.

## Siguientes comprobaciones obligatorias

1. Subir este ZIP descomprimido a un nuevo repositorio público `lurin-comunidad-android`.
2. Comprobar que el workflow `build-apk.yml` termina correctamente, y descargar su artefacto `Lurin-Comunidad-0.6.0-beta-Online-APK`.
3. Instalar la APK en **dos Android reales**, registrar cuentas distintas, confirmar emails y ejecutar `docs/PRUEBA_DOS_TELEFONOS.md`.
4. Asegurar protección contra spam y moderación de reportes. No hay beneficios comerciales reales en esta fase.
5. Publicar una pre-release solo si se prueban Auth, fotos, comentarios, likes, grupos, permisos y se cuenta con derechos de uso de los archivos de marca.

La firma de depuración no sirve para publicar en Play Store ni para actualizaciones duraderas: se necesita una clave de firma de lanzamiento administrada por quien publica.
