# Repositorio público independiente de Lurín Comunidad

**Repositorio requerido:** `lurin-comunidad-android`, con visibilidad `PUBLIC`, en la cuenta GitHub que tú selecciones. **No** es una rama ni fork de NEXUS o de otras APK privadas.

Las herramientas de GitHub conectadas permiten editar repositorios existentes, pero no crearlos. Una vez que el repositorio exista y el conector tenga acceso, se puede subir este proyecto completo a la rama `main`.

## Compilación ya preconfigurada

- El proyecto de Supabase **Lurin Comunidad Publica** ya existe y está separado de otros proyectos.
- `config/public-backend.json` contiene la URL y la clave **publicable** (apta para clientes Android). Nunca se incluye un `service_role` ni una contraseña de administración.
- `.github/workflows/build-apk.yml` compila con Java 17, Android 36, Gradle 8.13, WebKit 1.18.0 y firma de depuración.
- No necesitas configurar variables manualmente para la primera compilación: el proyecto usa `config/public-backend.json`. Las variables Actions pueden sobreescribir el archivo si es necesario.
- Después de subir los archivos a `main`, abre **Actions > Lurín Comunidad - compilar APK Android beta** y revisa el resultado. Descarga el artefacto `Lurin-Comunidad-0.6.0-beta-Online-APK`.
- El artefacto es un APK **debug** para pruebas privadas con voluntarios; su repositorio puede ser público. No es una versión de Play Store ni un APK final firmado para distribución general.
- Antes de marcar un tag `v0.6.0-beta`, verifica los permisos sobre logo y fotografías, la confirmación por correo de las cuentas, los reportes y las pruebas entre dos teléfonos físicos.

## Estado de backend

La base de datos contiene 18 tablas Lurín con RLS, 3 grupos y almacenamiento público de imágenes con permisos de subida por propietario. La auditoría de Supabase devolvió 0 advertencias de seguridad tras corregir la función de ranking.

Las pruebas automatizadas de dos sesiones usan un backend simulado; **todavía es obligatorio probar las cuentas de verdad** en el servidor y con una APK compilada.
