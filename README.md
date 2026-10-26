# INTERNET.exe

Escritorio de internet caótico para explorar. **Estado: etapa 1 de 5** (escritorio + ventanas).

## Ejecutar
Sin instalación ni dependencias. Opciones:
- Abre `index.html` con doble clic, o
- Desde esta carpeta: `python3 -m http.server 8000` y visita http://localhost:8000

## Estructura
- `index.html` — esqueleto de la página
- `css/style.css` — paleta, ventanas, barra de tareas, responsive
- `js/windows.js` — gestor de ventanas (abrir, arrastrar, enfocar, minimizar, cerrar)
- `js/apps.js` — contenido de cada ventana
- `js/main.js` — arranque y conexión con el DOM
