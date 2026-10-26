/* apps.js — el contenido de cada ventana.
   Cada "app" es un objeto: { id, title, glyph, width, render(body, wm) }.
   Para añadir un destino nuevo en las siguientes etapas solo hay que
   añadir otro objeto aquí. */
(function () {
  'use strict';

  const aboutApp = {
    id: 'acerca',
    title: 'Acerca_de.txt',
    glyph: '▤',
    width: 380,
    render(body) {
      body.innerHTML =
        '<h2 class="h">Estado de la obra</h2>' +
        '<p>Etapa 1 de 5: el escritorio ya funciona. Lo demás está en construcción, ' +
        'es decir, escondido.</p>' +
        '<dl class="kv">' +
          '<dt>Ventanas</dt><dd>arrastrar, minimizar, cerrar</dd>' +
          '<dt>Teclado</dt><dd>Tab hasta la barra de título y flechas para mover (Shift = más rápido)</dd>' +
          '<dt>Barra de tareas</dt><dd>un clic: enfoca, minimiza o restaura</dd>' +
          '<dt>Pendiente</dt><dd>destinos, secretos, minijuego y guardado</dd>' +
        '</dl>';
    }
  };

  const welcomeApp = {
    id: 'bienvenida',
    title: 'Bienvenida.txt',
    glyph: '▣',
    width: 440,
    render(body, wm) {
      body.innerHTML =
        '<p class="glitch" data-text="INTERNET.exe" aria-label="INTERNET.exe">INTERNET.exe</p>' +
        '<p>Eres el visitante número 1.000.000. No hay premio, pero sí mucho escritorio.</p>' +
        '<ul class="tips">' +
          '<li>Arrastra esta ventana por la barra de título.</li>' +
          '<li><kbd>_</kbd> la esconde en la barra de tareas; <kbd>×</kbd> la cierra.</li>' +
          '<li>Si la cierras, el icono de la izquierda la vuelve a abrir.</li>' +
        '</ul>' +
        '<p class="log">&gt; estado del sistema: casi estable<span class="caret" aria-hidden="true"></span></p>' +
        '<button type="button" class="btn" data-open="acerca">Abrir Acerca_de.txt</button>';
      body.querySelector('[data-open]').addEventListener('click', () => wm.open(aboutApp));
    }
  };

  window.IE = window.IE || {};
  window.IE.apps = [welcomeApp, aboutApp];
})();
