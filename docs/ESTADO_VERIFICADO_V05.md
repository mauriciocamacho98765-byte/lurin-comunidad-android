# Estado verificado · Lurín Comunidad Android beta 0.5.0

**2026-10-29**

| Componente | Comprobación |
|---|---|
| Logo | El contenedor de la bienvenida es transparente y sin borde ni sombra; logo original a todo color |
| Pantalla de ingreso | Mismo tratamiento del logo, formulario de correo y contraseña conservado |
| 26 vistas iniciales | Smoke test de Chromium: PASS |
| Publicaciones, fotos, comentarios y retos en DEMO | Test de interacciones local: PASS |
| Dos personas en backend de prueba | Mensajes, posts, likes y comentarios compartidos: PASS |
| Servidor Supabase REAL | Proyecto independiente creado y migraciones instaladas, 18 tablas RLS, 3 grupos y bucket de fotos |
| Seguridad en Supabase | Auditoría de seguridad: **0 advertencias** (ranking sin RPC SECURITY DEFINER) |
| Seguridad del Android | Único dominio HTTPS aprobado: backend de Lurín; internet y foto seleccionada, sin ubicación sensible |
| Dependencias Android | Android Gradle Plugin 8.13.2 / Gradle 8.13 / WebKit 1.18.0 confirmados en documentación oficial |
| GitHub Actions | Workflow listo, todavía sin repositorio público ni ejecución efectiva |
| APK nativa | **No compilada ni instalada**: el entorno local no dispone del SDK Android ni permite obtenerlo por Internet |
| Dos teléfonos reales contra Supabase | **Pendiente**: deben registrarse cuentas, confirmar email y probar mensajes y permisos |

Los puntos no pueden ser añadidos por el usuario desde el teléfono; se calculan mediante triggers SQL y se limitan por día. Los canjes son simulaciones hasta firmar acuerdos con comercios. La app pública necesitará moderación y respuesta a reportes antes de lanzamiento abierto.
