# Lurín Comunidad beta 0.5 · Logo sin tarjeta blanca

- Se eliminó **solo** el rectángulo blanco redondeado y su sombra que envolvían el logotipo al abrir la aplicación en modo demostración.
- En el modo comunitario online también se retiró el fondo blanco del encabezado con el logotipo de inicio de sesión. Los campos de correo y contraseña siguen teniendo sus propias superficies legibles.
- El PNG de origen conserva su canal alfa y los colores azul, verde y dorado a opacidad completa; no se alteró ni se blanqueó el logotipo.
- Se corrigió `scripts/verify_apk.sh`, que todavía exigía `0.3.0-beta` aun cuando la app llevaba otra versión. Ahora compara `0.5.0-beta`.
- Identificador de paquete sin cambios: `pe.lurin.comunidad`.
- Backend: SOLO Supabase exclusivo de Lurín, nunca se reutiliza uno privado.
- La APK aún requiere ejecutar GitHub Actions y pruebas en teléfonos físicos.
