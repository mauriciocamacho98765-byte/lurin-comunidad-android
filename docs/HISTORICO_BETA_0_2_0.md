# Cambios confirmados: beta Lurín Comunidad 0.2.0

## Mejoras implementadas en fuente

| Área | Resultado |
|---|---|
| Identidad visual | Misma marca y colores del prototipo original (`#3A477E`, `#A49E27`, `#AB7B1D`) |
| Android 15 | Adaptación para insets superior/inferior y barras del sistema |
| Android 13+ | Callback de retroceso moderno; anteriores conservan `onBackPressed` |
| WebView | Implementada recuperación limitada al terminar el proceso renderizador |
| WebView offline | Bloqueo de recursos remotos y CSP de origen local |
| Fotos | Conversión local a JPEG y reducción a un máximo de 1024 píxeles |
| Compartir | Removido enlace inválido del dominio interno `appassets` |
| Almacenamiento | La función `save()` informa fallos en lugar de silenciarlos |
| CI Android | APK validado por firma (`apksigner`), paquete (`aapt`) y SHA-256 |

## Pruebas ejecutadas en este entorno

- `python3 scripts/check_project.py`: pasó, con 26 pantallas, 3 colores y HTML/JS válido.
- `python3 tests/test_browser_offline.py`: pasó; 26 rutas, fotografía comprimida,
  publicación, comentarios, texto compartido, reto, saldo demo y ausencia de
  errores JS o peticiones externas.
- La persistencia se comprobó contra una implementación de prueba compatible
  con la interfaz de `localStorage`. **No se pudo hacer una navegación real y
  recarga del navegador en este sandbox**, por su política de navegación.
- Archivos de workflows examinados con un analizador YAML.
- Java y manifiesto validados estáticamente; **no ejecutados contra un SDK Android**.

## Pendiente antes de la etiqueta "APK verificable"

1. Crear repo público separado `lurin-comunidad-android` en la cuenta de GitHub
   elegida y conceder acceso al conector.
2. Ejecutar `.github/workflows/build-apk.yml` y comprobar que el job termina en verde.
3. Descargar `app-debug.apk`, instalarlo en un Android real y probar la carga,
   barras de sistema, selector de fotos, retroceso y cierres.
4. Comprobar las licencias de redistribución de fotos y logo antes de liberar
   el repositorio y APK a desconocidos.
5. Para una app actualizable sin desinstalar, reemplazar la firma de depuración
   efímera por un proceso de firma release con keystore permanente y protegido.

No hay backend real ni conversión de puntos a dinero o servicios.
