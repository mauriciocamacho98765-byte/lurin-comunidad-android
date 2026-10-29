
## Beta 0.7 · Interfaz Android corregida (29 octubre 2026)

- Se elimina el marco de teléfono de las páginas del APK: el sistema Android es el contenedor, no hay segundo teléfono dentro de BlueStacks.
- La bienvenida conserva el logo a color sobre fondo crema, sin tarjeta blanca detrás.
- El acceso de visitante permite elegir apodo **sin correo**, si se activa **Anonymous Sign-Ins** en Supabase Authentication → Providers. Esa identidad se guarda solo en el dispositivo: si se borran datos o se cambia de dispositivo puede perderse.
- Se muestran tres historias y comentarios **de muestra claramente etiquetados** solo cuando aún no existen publicaciones compartidas; no se introducen perfiles ni publicaciones ficticias en la base real.
- Retos de la comunidad con descripción, foto y envío a moderación; los puntos indicados se asignan **solo tras revisión y aprobación**, todavía sin circuito comercial de canjes.
- Cuatro propuestas visuales de recompensas: gastronomía, caballos de paso, artesanía y rutas; incluyen puntos y zonas referenciales. **No hay cupones reales, comercios aliados confirmados ni beneficios canjeables**.
- La comunidad continúa guardando posts, comentarios, seguidores y mensajes en Supabase dedicado, separado de NEXUS.
- Verificaciones locales: suite de 26 rutas, dos navegadores con un backend simulado y nueva prueba de visualización Android v07. Sin prueba de instalación física todavía.

### Requisito imprescindible para participar sin correo

En el proyecto `Lurin Comunidad Publica` (`tjvftleczansqadojxnd`) debe activarse **Anonymous Sign-Ins** en Authentication → Providers (Supabase). El conector del proyecto no permite cambiar este ajuste directamente. La aplicación dará un mensaje si está desactivado; no debe anunciarse como acceso anónimo activo hasta comprobarlo contra Supabase real.

**Nota:** los precios o puntajes son referencias de diseño; la beta no cobra ni emite entradas reales.

# Lurín Comunidad — Android beta 0.7.0 · Comunidad Android sin marco, visitante y propuestas recreativas

**Proyecto público independiente** del traductor, NEXUS y cualquier repositorio privado. Aplicación recreativa para Android con la identidad visual original del prototipo de Marca Lurín: azul `#3A477E`, verde oliva `#A49E27` y dorado `#AB7B1D`. Mantiene las 26 pantallas base del prototipo, sin transmitir las fotos ni archivos privados de otros proyectos.


## Novedades comprobadas de la beta 0.6.0

- **Seguir personas:** desde una publicación puedes seguir o dejar de seguir a su autora o autor. Las relaciones se guardan en `lurin_follows` con RLS que solo autoriza acciones propias.
- **Muro personalizado:** pestañas **Todos / Siguiendo**. El filtro consulta la relación compartida y no altera las publicaciones de otras personas.
- **Eventos comunitarios:** consulta eventos marcados como visibles por un organizador; podrás indicar asistencia o cancelarla. Ninguna fecha ni beneficio se inventa si no hay un evento publicado. Las inscripciones **no equivalen a entradas o reservas**.
- **Estado de red:** si hay un error de conexión, se muestra el aviso de desconexión y se recupera tras una solicitud satisfactoria.
- **Tests:** `tests/test_two_phones.py` verifica las nuevas funciones junto con publicación cruzada, comentarios, reacciones, chats y puntos, usando servidor simulado.
- **Marca:** no se modifica el logotipo corregido ni el fondo crema sin tarjeta blanca.
- **Versionado:** `versionCode 6`, `versionName 0.6.0-beta` y nombre de artefacto GitHub actualizado.

### Situación del backend online (2026-10-29)

Proyecto Supabase `Lurin Comunidad Publica` (`tjvftleczansqadojxnd`), **ACTIVE_HEALTHY**, completamente separado del backend de NEXUS. Se verificó que mantiene 18 tablas de Lurín con RLS, 3 salas comunitarias y cero advertencias de seguridad del analizador. Todavía tiene **0 usuarios, 0 publicaciones y 0 eventos visibles**. El frontend está conectado por URL y clave publicable; su funcionamiento **con cuentas y dispositivos reales** sigue sin verificarse.

No se ha generado ni probado una APK instalable: este entorno no dispone de SDK Android y no puede descargar Gradle. Para compilar, crea un repositorio **público nuevo** y ejecuta el workflow `.github/workflows/build-apk.yml` o usa Android Studio. No añadir secretos ni materiales de NEXUS al repositorio.

La API de Supabase no requiere OpenAI API Key; no se ha creado ninguna clave de OpenAI para esta aplicación.

## Estado real

| Componente | Estado |
|---|---|
| Interfaz Android, logo y 26 recorridos base | Disponible en código fuente |
| WebView Android con host HTTPS del backend en allowlist | Implementado, compilación nativa pendiente |
| Autenticación por correo, sesiones y perfiles | Conectada al Supabase exclusivo; faltan pruebas de registro real y correo |
| Muro entre cuentas, publicaciones, fotos, comentarios, likes | Pruebas automáticas con dos navegadores y backend de prueba: PASS |
| Chats comunitarios entre dispositivos | Pruebas automáticas con dos navegadores y backend de prueba: PASS |
| Puntos contra base de datos, ranking y límites diarios | Implementados en migración; sin pruebas de integración sobre DB real |
| RLS/Storage/reporte y controles antiabuso básicos | Desplegados en Supabase exclusivo, sin advertencias de seguridad detectadas |
| Cupones y premios de restaurantes | **Desactivados**, requieren comercios reales, validación y antifraude |
| Repositorio público GitHub, APK firmada y pruebas en dos celulares | **PENDIENTES** |

El Supabase exclusivo `Lurin Comunidad Publica` ya fue creado. La comunidad real requiere aplicar migraciones, activar Auth y validar el acceso desde dos Android físicos antes de anunciar disponibilidad pública.

## Cómo funciona la comunidad

1. Ana y Luis crean **cuentas diferentes** y confirman su email.
2. Ana publica una fotografía o historia de Lurín. El texto y la referencia a la foto se guardan en Supabase, bajo su identidad.
3. Luis abre la app y ve el post mediante el muro compartido (refresco aproximado cada 6 segundos con la app abierta, también al volver al primer plano). Puede comentar y reaccionar.
4. Ana refresca su muro y consulta los comentarios. En grupos públicos, ambos pueden unirse y conversar.
5. Los puntos se suman **mediante triggers SQL** con límites, no mediante botones manipulables. Las recompensas comerciales están desactivadas.

## Estructura

- `web/base.html`: prototipo original con imágenes, colores y recorridos de Lurín.
- `web/live_community.js`: cliente de autenticación, PostgREST, fotos, muro y chats entre usuarios.
- `scripts/bundle_live.py`: inyecta la configuración y scripts en un único HTML; sin bibliotecas JS desde CDN.
- `app/`: WebView Java Android, identificador exclusivo `pe.lurin.comunidad`.
- `supabase/migrations/`: tres migraciones para instalar únicamente en **un proyecto nuevo de Lurín** (ya aplicadas al proyecto exclusivo).
- `.github/workflows/`: compilación debug y publicación opcional como beta, **con backend obligatorio**.
- `tests/test_two_phones.py`: dos instancias independientes contra servidor simulado; comprueba el intercambio de datos y comentarios.
- `tests/test_security_contract.py`: reglas SQL y compilación fail-closed.

## Pasos para configurar el backend real

1. Proyecto Supabase exclusivo ya creado: `Lurin Comunidad Publica` (`tjvftleczansqadojxnd`), costo confirmado de US$0/mes. No reusar NEXUS.
2. Migraciones de comunidad aplicadas y RLS verificada. No vuelvas a ejecutarlas en este proyecto existente.
3. Habilitar **Auth con email y confirmación de correo**. Revisar SMTP para correos de confirmación antes de invitar público general.
4. En una **nueva instalación** distinta de este Supabase, ejecutar en orden (ya están aplicadas en el actual):
   - `supabase/migrations/20261029000100_lurin_comunidad_independiente.sql`
   - `supabase/migrations/20261029000200_shared_community.sql`
   - `supabase/migrations/20261029000300_lurin_public_ranking_rls_perf.sql`
5. Auditar RLS, Storage, seguridad, tasas, políticas, y revisar las tablas `lurin_...`. No habilitar ninguna clave administrativa en Android.
6. El archivo `config/public-backend.json` incluye SOLO la URL y la clave **publicable** del Supabase exclusivo. GitHub Actions las utilizará por defecto. Se pueden sobreescribir con `LURIN_SUPABASE_URL` y `LURIN_SUPABASE_PUBLISHABLE_KEY`. Nunca añadir claves secret ni `service_role`.
7. Ejecutar el workflow de Android. **Falla intencionalmente si no está configurado el backend.** La APK usará exclusivamente la URL autorizada.
8. Instalar el APK en **dos teléfonos reales**, usar diferentes cuentas y seguir `docs/PRUEBA_DOS_TELEFONOS.md`.

### Prueba manual sin subir código todavía

Para generar el HTML de demo local: `python3 scripts/bundle_live.py`.
Para generar el HTML con un backend real y la clave **publicable** configurados:

```bash
LURIN_SUPABASE_URL="https://tu-proyecto.supabase.co" \
LURIN_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..." \
python3 scripts/bundle_live.py --require-online
```

El backend independiente real ya está preconfigurado en `config/public-backend.json`. Ejecutar `python3 scripts/bundle_live.py --require-online` genera el cliente conectado sin requerir secretos. Para probar la demostración local, usa `python3 scripts/bundle_live.py --demo` con `LURIN_BUNDLE_OUTPUT` a una ruta distinta. **No debes publicar la demo como APK multiusuario.**

### QA automatizado ya ejecutado aquí

```bash
python3 scripts/check_project.py
python3 tests/test_security_contract.py
python3 tests/test_browser_offline.py
python3 tests/test_two_phones.py
```

El test multiusuario utiliza un **backend falso compartido en memoria**, no un proyecto Supabase desplegado. Por eso pasa aun cuando no hay infraestructura real.

## Publicación y responsabilidades

- Repositorio nuevo, **Public**, exclusivo `lurin-comunidad-android`. No copiar material de NEXUS ni credenciales ajenas.
- No subir `local.properties`, contraseñas, keystores ni secretos. El identificador `pe.lurin.comunidad` es propio.
- Verificar licencias de las fotografías, del logo y autorización de uso de marca antes de redistribuir públicamente los recursos (`NOTICE_ASSETS.md`). El código MIT **no concede derechos sobre contenido del brief**.
- Revisar privacidad, consentimiento de imágenes de otras personas, menores, moderación, reportes, borrado de cuentas y condiciones legales antes del lanzamiento general.
- Una APK debug de GitHub Actions es una **beta de prueba**, no una aplicación Google Play ni una app avalada por la Municipalidad de Lurín.

Más información: `docs/ARQUITECTURA.md`, `docs/PRUEBA_DOS_TELEFONOS.md`, `docs/ESTADO_VERIFICADO.md`.

## Actualización de identidad v0.4

Se reemplazó el logo descolorido por el archivo original **333.png** aportado por el propietario; más detalles en `docs/LOGO_V04_ACTUALIZACION.md`.

## Cambios en la beta 0.5

- Inicio sin tarjeta blanca detrás del logo, respetando sus colores y transparencias.
- Pantalla de acceso online también sin fondo blanco detrás del logo.
- Supabase `Lurin Comunidad Publica` (nuevo, independiente) ya creado, con 18 tablas RLS y 3 grupos.
- Ranking y saldo calculados en servidor, sin función pública SECURITY DEFINER.
- Backend público configurado por defecto con publishable key apta para cliente, protegida por RLS.
- `scripts/verify_apk.sh` ya compara la versión correcta `0.6.0-beta` (actualizada para esta compilación).
- No hay APK descargable hasta que se ejecute un build verificado en GitHub Actions o Android Studio con SDK.

**Nota de seguridad:** en una aplicación abierta a personas reales se necesita moderación, bloqueo de abuso y pruebas de registro con emails reales antes de afirmar que está lista para lanzarse. Los canjes de restaurantes son solo demostración.


## Beta 0.8: acceso sin correo
- **Visitante:** se crea una cuenta real de Supabase Auth en el servidor Lurín, sin pedir email. No depende de habilitar `Anonymous Sign-Ins`.
- **Usuario y contraseña:** registro e inicio de sesión sin correo. El proveedor Supabase Auth guarda el hash de la contraseña; el alias interno se deriva por HMAC exclusivamente en Edge Functions.
- **Proteger mi cuenta:** el visitante puede asignar un usuario y contraseña desde Perfil y conservar su identidad, publicaciones y puntos.
- **Límite:** sin correo todavía no hay restablecimiento automático de contraseña. Quien se registre debe conservarla; si el visitante borra datos sin protegerse puede perder acceso.
- El servicio de identidad tiene cuotas por acción y clave administrativa exclusivamente en el servidor. La APK pública usa solo la clave publicable y RLS.
