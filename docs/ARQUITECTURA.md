# Arquitectura v0.3 — Lurín Comunidad pública

**Aislamiento:** app Android `pe.lurin.comunidad`; repositorio GitHub público nuevo; proyecto Supabase exclusivo nuevo, NO `avvecnxrtjznaojpgodp` ni servicio de NEXUS. No importa código privado.

**UI:** HTML/CSS/JS empaquetado en Android WebViewAssetLoader, manteniendo 26 pantallas y los colores de Marca Lurín. `bundle_live.py` integra un cliente REST sin dependencias de CDN.

**Conexión:** MainActivity autoriza mediante `BuildConfig.SUPABASE_HOST` un ÚNICO host HTTPS de backend. CSP limita conexiones e imágenes a ese mismo proyecto Supabase y a las imágenes locales/data/blob. Solo se incrusta una clave publicable, jamás una clave administrativa.

**Identidad:** Supabase GoTrue email/password; sesión local revocable; políticas RLS por `auth.uid()`.

**Publicaciones:** UI → fotos en Storage carpeta `<uid>/` → `lurin_posts` (visibles inmediatamente) → muro en otros dispositivos mediante refresco cada 6 s y al foreground. Comentarios y likes consultados desde base de datos. Sin datos inventados en muro real.

**Mensajería:** grupos públicos precargados; miembros autorizados via `lurin_room_members`; `lurin_messages` privado a miembros mediante RLS. Refresco cada 6 s con el chat abierto.

**Puntos:** triggers limitados e idempotentes escriben un ledger privado: +30 por publicación (máx. 3 por día), +5 por comentario útil en publicaciones ajenas (máx. 5 al día). No hay INSERT/UPDATE de ledger permitido al cliente. RPC `lurin_my_points` muestra saldo propio; `lurin_top_raices` expone solo sumas y nombres públicos.

**Retos:** envío pendiente de revisión. No se adjudican puntos de retos sin un administrador y validación.

**Premios:** canjes comerciales, descuentos y códigos no operativos hasta acuerdos con establecimientos, validación y administración segura del saldo. La beta no es un sistema de pago ni voucher real.

**Limitaciones pendientes:** creación y migración reales de Supabase, auditoría de RLS y abusos, moderadores, notificaciones push, almacenamiento/costos, funcionamiento de OTP/SMTP, firma release, instalación en dos móviles físicos y carga de GitHub público.
