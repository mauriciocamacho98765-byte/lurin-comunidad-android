# Prueba de aceptación entre DOS teléfonos Android

**Requisito previo:** APK debug compilada con el nuevo Supabase independiente y dos correos/usuarios de prueba distintos. Ambos dispositivos con Internet.

1. Instala la misma APK en teléfono A y B. Comprueba que ambos abren la pantalla de login, **no** el muro ficticio de demostración.
2. Crea cuentas con email real y confírmalas. Inicia sesión como Ana en A y Luis en B.
3. En A pulsa Crear historia, escribe un título de mínimo 6 caracteres, una descripción de mínimo 15 y publica una foto original. La app debe confirmar la publicación.
4. En B, en menos de unos 6–12 segundos con la app abierta, debe aparecer el texto y la foto. Si está en segundo plano, al volver a abrir el muro debe refrescarse.
5. En B abre comentarios, escribe 20+ caracteres y publícalo. En A entra al mismo post: debe ver el comentario del otro usuario.
6. En B pulsa Me gusta; comprueba en A que el contador cambia al refrescar.
7. En A y B entra al mismo grupo público y únete. Envía un mensaje desde B; en A debe mostrarse al sincronizar.
8. En A entra a Puntos y confirma +30 por publicar (hasta 3 al día). En B confirma +5 por comentario útil sobre la publicación de otra persona.
9. Desde B pulsa **Seguir** en la publicación de Ana. Abre la pestaña **Siguiendo** y comprueba que aparece la historia; al dejar de seguir desaparece de ese filtro, pero sigue en **Todos**.
10. Cuando exista un evento **real y verificado** visible en Supabase, B podrá apuntarse o cancelar su asistencia; A no debe poder modificar las inscripciones de B. Si aún no hay eventos, la app debe mostrar el estado vacío sin fechas inventadas.
11. Cierra sesión en A: debe volver a login, y no permitir enviar publicaciones autenticadas.
12. Cierra y abre la aplicación; inicia sesión otra vez y comprueba que sus publicaciones siguen en el backend. No deben desaparecer por borrar el almacenamiento local de la app (aunque ello cerrará sesión).
13. Reporta una publicación desde B y confirma en Supabase que existe el reporte privado. El autor A **no** debe poder leer reportes de otros usuarios.
14. Ejecuta pruebas de RLS manuales: Ana no puede borrar posts de Luis; Luis no puede escribir ledger; usuario fuera de un grupo no debe leer los mensajes de ese grupo.

**Resultado esperado:** todas las funciones núcleo comparten datos entre teléfonos. Si una falla, no publicar la APK como versión pública lista para producción.

**Pendiente seguridad:** acuerdos con comercios para habilitar canjes, moderación de contenidos, retención de fotos, menores y políticas de comunidad.
