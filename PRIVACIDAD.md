# Privacidad — Lurín Comunidad (borrador de prueba)

La beta de comunidad compartida prevé almacenar en un proyecto Supabase exclusivo: correo de inicio de sesión, nombre público/alias, publicaciones y fotografías compartidas, comentarios, reacciones, membresías de grupos, mensajes, reportes y registro de puntos.

- Tus **publicaciones y fotos del muro son públicas** para usuarios autenticados; no publiques ubicación exacta, menores identificables ni información confidencial sin permiso.
- Los mensajes de grupos se limitan mediante RLS a miembros que se han unido al grupo. No son mensajes cifrados extremo a extremo.
- El correo y tokens de sesión se usan para autenticar; el correo no se muestra en el muro.
- No se solicitan contactos, SMS, ubicación GPS precisa ni acceso general a archivos del teléfono.
- Los reportes se limitan al autor del reporte y a los operadores de moderación.
- El saldo se calcula desde un historial privado de puntos. Los cupones comerciales no funcionan.
- Las imágenes del muro pueden ser accesibles desde URLs públicas; al lanzar el servicio se debe definir plazo de conservación y método de eliminación.

Este texto es un borrador técnico y **no reemplaza** términos legales, avisos de privacidad, política de moderación y procedimientos de eliminación de cuentas que deben revisarse antes del lanzamiento general.
