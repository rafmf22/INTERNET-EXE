/* main.js — arranque: conecta el DOM con el gestor de ventanas. */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const status = $('#status');

  // Anunciar a lectores de pantalla: vaciar y volver a escribir fuerza la lectura.
  function announce(msg) {
    status.textContent = '';
    setTimeout(() => { status.textContent = msg; }, 30);
  }

  const wm = new IE.WindowManager({
    layer: $('#windows'),
    tasks: $('#tasks'),
    announce
  });

  // Iconos del escritorio: un botón real por cada app.
  const icons = $('#icons');
  IE.apps.forEach((app) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon';
    b.innerHTML = '<span class="icon__glyph" aria-hidden="true"></span><span class="icon__label"></span>';
    b.querySelector('.icon__glyph').textContent = app.glyph;
    b.querySelector('.icon__label').textContent = app.title;
    b.addEventListener('click', () => wm.open(app));
    icons.appendChild(b);
  });

  $('#show-desktop').addEventListener('click', () => wm.showDesktop());

  // Reloj
  const clock = $('#clock');
  function tick() {
    const d = new Date();
    clock.textContent = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    clock.dateTime = d.toISOString();
  }
  tick();
  setInterval(tick, 15000);

  // Ventana inicial
  wm.open(IE.apps[0]);
})();
