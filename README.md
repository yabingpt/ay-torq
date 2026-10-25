# AY TORQ

Aplicación web progresiva para planificar rutinas, registrar series y revisar el progreso del entrenamiento. Proyecto independiente, hecho con HTML, CSS y JavaScript sin dependencias de ejecución.

## Pruebas

Las reglas del modelo se pueden verificar con Node.js, sin instalar dependencias:

```sh
node --test tests/model.test.js
```

## Ejecutar en local

Un service worker necesita `localhost` o HTTPS. Desde esta carpeta, ejecuta:

```sh
python -m http.server 8000
```

Abre `http://localhost:8000`. También puedes servir esta carpeta con cualquier servidor estático.

## Funciones

- Plan semanal de lunes a domingo con un máximo de una rutina por día.
- Rutinas y ejercicios editables, con reordenamiento, series planificadas individuales, carga y notas permanentes. Puedes añadir y quitar series concretas sin cambiar el número de series de otras rutinas.
- Sincronización de ejercicios repetidos por identidad estable: peso y repeticiones, solo peso o independiente. Los nombres coincidentes se vinculan de forma conservadora; los demás se pueden vincular manualmente. Los registros reales de una sesión no cambian el plan ni el historial anterior.
- Registro de peso, repeticiones y estado por serie durante una sesión. Los borradores se guardan automáticamente y cada sesión guardada conserva una copia de lo ejecutado.
- Estimación de duración basada en 1 minuto por serie y unos 3 minutos de descanso entre series; se muestra antes de iniciar y durante la rutina. El historial conserva también la duración real de la sesión.
- Confirmación antes de descartar un entrenamiento en curso.
- Historial con una copia inmutable del entrenamiento guardado; cambiar la rutina no reescribe sesiones previas.
- Borrado de una sesión individual, de un día o de una semana, con confirmación y resumen del número de registros afectados.
- Pestaña Progresión con filtros de periodo, ejercicio, rutina, métrica y agrupación; calcula peso máximo, repeticiones y volumen solo a partir de series completadas.
- Historial con volumen por sesión calculado como peso × repeticiones en series completadas válidas.
- Copia de seguridad JSON, restauración con advertencia y respaldo local del formato anterior antes de la primera ampliación de datos. Uso sin conexión después de la primera carga.
- Diseño adaptable y navegación adecuada para móvil.

## Datos, privacidad y sincronización

AY TORQ guarda rutinas, borradores e historial bajo la clave existente `ay-torq-v1` en `localStorage` del navegador. La información permanece al cerrar o recargar la aplicación en ese mismo perfil del navegador, pero **no se sincroniza entre iPhone, computadora ni navegadores**. Borrar los datos del sitio o perder el perfil del navegador puede borrar el registro. Usa **Perfil → Exportar copia** para crear respaldos periódicos y guárdalos en un lugar privado. Importar sustituye los datos del navegador actual.

Esta versión no usa base de datos, cuenta, backend ni credenciales; no afirma ofrecer sincronización. Para habilitar sincronización multi-dispositivo hace falta elegir y configurar un servicio remoto con autenticación y reglas de acceso. Esa infraestructura no está configurada en este proyecto.

## Instalar en iPhone

1. Publica el sitio bajo HTTPS y ábrelo en Safari.
2. Pulsa **Compartir** y elige **Añadir a pantalla de inicio**.
3. Confirma el nombre AY TORQ.

La app conserva los archivos de la interfaz para abrirlos sin conexión tras la primera visita. El almacenamiento de datos sigue siendo local a ese navegador.

## Publicación y actualizaciones

- Repositorio público: https://github.com/yabingpt/ay-torq
- Aplicación: https://yabingpt.github.io/ay-torq/
- GitHub Pages publica desde la rama `main`, carpeta raíz. El deploy automático se ejecuta cuando se actualiza esa rama.

AY TORQ es una app estática y no necesita proceso de compilación, backend ni credenciales. GitHub Pages está incluido en el plan gratuito para repositorios públicos; no hay una base de datos ni un servicio de pago configurado. Un dominio personalizado, si se desea después, podría tener coste por separado. [Planes de GitHub](https://docs.github.com/en/get-started/learning-about-github/githubs-plans).

Para actualizarla, edita los archivos de este repositorio y publica los cambios en `main`; GitHub Pages desplegará la nueva versión automáticamente. Si cambias archivos de la interfaz, incrementa el valor de `CACHE` en `sw.js` y el parámetro de versión de `app.js` en `index.html` para que las instalaciones PWA descarguen los recursos nuevos. Mantén este repositorio separado de cualquier otro proyecto.

## Diseño

La interfaz adapta la referencia proporcionada: fondo casi negro, paneles grafito, bordes finos, acento rojo, títulos condensados, controles compactos de registro y barra inferior fija. La marca AY TORQ usa una “T” geométrica como alusión sutil al torque. Los ejemplos de entrenamiento no están precargados; el estado inicial está vacío.
