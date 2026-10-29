# Estado técnico — Lurín Comunidad v0.6.0-beta

**Fecha:** 2026-10-29. **Objetivo:** Android con comunidad multiusuario pública, aislada de los proyectos privados.

## Verificado aquí

- Configuración APK: `pe.lurin.comunidad`, `versionCode=6`, `versionName=0.6.0-beta`.
- JavaScript y HTML empaquetados, estructura Android, CSP y host HTTPS permitidos.
- Logo original con color sólido en bienvenida y acceso, sin tarjeta blanca.
- 26 pantallas base de la marca, sin remaquetación que cambie su identidad.
- Pruebas de dos contextos independientes **contra servidor falso**, sin fallos JS: ver/publicar, comentar, reaccionar, chat, seguir/dejar de seguir, filtrar publicaciones, confirmar/cancelar asistencia a evento y saldo calculado fuera del cliente.
- Proyecto Supabase exclusivo `tjvftleczansqadojxnd`: **activo**; 18 tablas públicas de Lurín, 3 salas y sin advertencias de seguridad en advisor.
- Versión Gradle 8.13 + AGP 8.13.2 + AndroidX WebKit 1.18.0 comprobada en documentación de Android; **no se ejecutó la compilación**.
- No se escribió en GitHub ni en un repositorio de NEXUS. No se tocó la base de datos privada existente.

## Pendiente antes de afirmar «100% funcional»

1. Compilar un APK real en CI o Android Studio, verificar firma, paquete e instalarla en dos Android reales.
2. Crear dos cuentas reales con correos y verificar registro, inicio de sesión, publicación y comentario cruzados en Supabase real; probar carga de fotos y pérdida temporal de Internet.
3. Evaluar moderación y gestión de reportes, privacidad, fotos de terceros y eliminación de cuenta antes de permitir acceso al público general.
4. Comprobar permisos de uso público del logo y las fotografías de la campaña.
5. Crear el repositorio GitHub público **nuevo y separado** `lurin-comunidad-android` (aún inexistente en las conexiones revisadas).
6. Abrir eventos y canjes únicamente con datos y acuerdos verificados de los organizadores; los premios comerciales no están activos.

**No confundir:** la prueba en navegadores con servidor simulado no acredita que haya una APK compilada ni que Supabase real ya se probó entre teléfonos.
