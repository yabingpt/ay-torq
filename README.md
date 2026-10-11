# AY TORQ

Aplicación web progresiva para planificar rutinas, registrar series y revisar el progreso del entrenamiento. Proyecto independiente, hecho con HTML, CSS y JavaScript sin dependencias de ejecución.

## Ejecutar en local

Un service worker necesita `localhost` o HTTPS. Desde esta carpeta, ejecuta:

```sh
python -m http.server 8000
```

Abre `http://localhost:8000`. También puedes servir esta carpeta con cualquier servidor estático.

## Funciones

- Plan semanal de lunes a domingo con un máximo de una rutina por día.
- Rutinas y ejercicios editables, con reordenamiento, series objetivo, carga planificada y notas.
- Registro independiente de peso, repeticiones y estado por serie durante una sesión. Los valores del plan no se alteran al registrar una sesión.
- Borradores guardados automáticamente, duración aproximada y confirmación antes de descartar.
- Historial con una copia inmutable del entrenamiento guardado; cambiar la rutina no reescribe sesiones previas.
- Borrado de una sesión individual, de un día o de una semana, con confirmación y resumen del número de registros afectados.
- Estadísticas y gráfico basados solo en series completadas que estén guardadas.
- Copia de seguridad JSON, restauración y uso sin conexión después de la primera carga.
- Diseño adaptable y navegación adecuada para móvil.

## Datos, privacidad y sincronización

AY TORQ guarda rutinas, borradores y sesiones en `localStorage` del navegador. La información permanece al cerrar o recargar la aplicación en ese mismo perfil del navegador, pero **no se sincroniza entre iPhone, computadora ni navegadores**. Borrar los datos del sitio o perder el perfil del navegador puede borrar el registro. Usa **Perfil → Exportar copia** para crear respaldos periódicos y guárdalos en un lugar privado. Importar sustituye los datos del navegador actual.

Esta versión no usa base de datos, cuenta, backend ni credenciales; no afirma ofrecer sincronización. Para habilitar sincronización multi-dispositivo hace falta elegir y configurar un servicio remoto con autenticación y reglas de acceso. Esa infraestructura no está configurada en este proyecto.

## Instalar en iPhone

1. Publica el sitio bajo HTTPS y ábrelo en Safari.
2. Pulsa **Compartir** y elige **Añadir a pantalla de inicio**.
3. Confirma el nombre AY TORQ.

La app conserva los archivos de la interfaz para abrirlos sin conexión tras la primera visita. El almacenamiento de datos sigue siendo local a ese navegador.

## Publicación y actualizaciones

Este proyecto es estático y puede alojarse en GitHub Pages, Netlify o Vercel. La carpeta no necesita un proceso de compilación. Al publicar una nueva versión, actualiza el nombre de caché `CACHE` en `sw.js` para que los dispositivos reciban los archivos nuevos. No sobrescribas ni conectes este proyecto al repositorio de otra aplicación.

Todavía no hay repositorio GitHub ni despliegue público asociado a esta copia. La publicación requiere acceso autorizado a una cuenta/proveedor y elegir el destino.

## Diseño

La interfaz adapta la referencia proporcionada: fondo casi negro, paneles grafito, bordes finos, acento rojo, títulos condensados, controles compactos de registro y barra inferior fija. La marca AY TORQ usa una “T” geométrica como alusión sutil al torque. Los ejemplos de entrenamiento no están precargados; el estado inicial está vacío.
