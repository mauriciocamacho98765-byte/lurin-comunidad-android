# Lurín Comunidad beta 0.4.0 — Estado comprobado

## Cambios entregados
- Logo 333.png **original del usuario**, sin reducir opacidad, en bienvenida, cabecera y acceso de cuenta.
- Nuevo icono Android adaptativo 432×432 y densidades mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi.
- Paleta conservada: `#3A477E`, `#A49E27` y `#AB7B1D`.
- Identificador exclusivo `pe.lurin.comunidad`, sin acceso a archivos, repositorios ni servicios de NEXUS o el traductor.
- Versión incrementada a `0.4.0-beta`.

## Pruebas locales
- `scripts/check_project.py`: PASS.
- `tests/test_logo_v04.py`: PASS, saturación y opacidad del logo.
- `tests/test_security_contract.py`: PASS (revisión estática).
- `tests/test_browser_offline.py`: PASS (26 vistas y uso local).
- `tests/test_two_phones.py`: PASS (2 navegadores con **backend simulado**).

## Pendientes antes de poder llamar a la aplicación multiusuario real
1. Crear proyecto Supabase **nuevo y exclusivo** `Lurin Comunidad Publica`; la organización Tenshixgame cotizó **US$0/mes** pero la operación solicita confirmación de costo.
2. Instalar las dos migraciones, revisar reportes, permisos RLS y hacer pruebas de integración con usuarios reales.
3. Publicar un repositorio GitHub **nuevo, PUBLIC**, seleccionado por el propietario; ninguna cuenta privada anterior debe reutilizarse.
4. Compilar y descargar APK mediante GitHub Actions. **Esta sesión no tiene Android SDK local.**
5. Instalar en dos teléfonos Android físicos con distintas cuentas y probar foto, publicación, comentario, chat, borrado de contenido y redes móviles.
6. Obtener las autorizaciones de logo, fotografías y condiciones de recompensas y moderación antes de anunciarlo como servicio público.

**No existe todavía una APK compilada ni un servicio Supabase desplegado para Lurín.**
