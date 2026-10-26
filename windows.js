/* windows.js — el gestor de ventanas.
   Se encarga de: crear, arrastrar, enfocar, minimizar, cerrar
   y reflejar todo en la barra de tareas. No sabe nada del contenido. */
(function () {
  'use strict';

  const MIN_VISIBLE = 72;   // píxeles de la ventana que siempre deben quedar a la vista
  const BAR_H = 36;         // altura mínima visible vertical
  const KEY_STEP = 16;      // paso al mover con teclado

  /* Función pura (sin DOM): mantiene la ventana dentro del escritorio.
     Al ser pura es fácil de probar. */
  function clampPosition(x, y, w, h, deskW, deskH) {
    const minX = MIN_VISIBLE - w;
    const maxX = deskW - MIN_VISIBLE;
    const maxY = Math.max(0, deskH - BAR_H);
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, 0), maxY)
    };
  }

  class WindowManager {
    constructor({ layer, tasks, announce }) {
      this.layer = layer;       // contenedor de ventanas
      this.tasks = tasks;       // contenedor de botones de la barra de tareas
      this.announce = announce || function () {};
      this.windows = new Map(); // id -> { app, el, taskBtn, minimized, x, y }
      this.z = 10;
      this.cascade = 0;
      this.activeId = null;
      this.hiddenByDesktop = [];
      window.addEventListener('resize', () => this.reclampAll());
    }

    get bounds() {
      return { w: this.layer.clientWidth, h: this.layer.clientHeight };
    }

    open(app) {
      const existing = this.windows.get(app.id);
      if (existing) {                       // no duplicamos: traemos la que ya existe
        this.restore(app.id);
        return existing;
      }
      const el = this.buildWindow(app);
      const taskBtn = this.buildTaskButton(app);
      const rec = { app, el, taskBtn, minimized: false, x: 0, y: 0 };
      this.windows.set(app.id, rec);

      this.layer.appendChild(el);
      this.tasks.appendChild(taskBtn);
      app.render(el.querySelector('.win__body'), this.api());

      // tamaño y posición inicial en cascada
      const { w: dw, h: dh } = this.bounds;
      const width = Math.min(app.width || 420, dw - 16);
      el.style.width = width + 'px';
      el.style.maxHeight = Math.max(160, dh - 16) + 'px';
      const step = this.cascade++ % 6;
      const narrow = dw < 640;
      const x = narrow ? (dw - width) / 2 : 120 + step * 32;
      const y = narrow ? 12 + step * 20 : 24 + step * 28;
      this.moveTo(rec, x, y);

      this.focus(app.id);
      this.announce('Ventana abierta: ' + app.title);
      return rec;
    }

    api() {
      // lo que las apps pueden pedirle al gestor
      return { open: (app) => this.open(app), close: (id) => this.close(id) };
    }

    buildWindow(app) {
      const el = document.createElement('section');
      el.className = 'win is-opening';
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', app.title);
      el.dataset.id = app.id;

      el.innerHTML =
        '<header class="win__bar" tabindex="0" title="Arrastra para mover (o usa las flechas del teclado)">' +
          '<span class="win__glyph" aria-hidden="true"></span>' +
          '<span class="win__title"></span>' +
          '<button type="button" class="win__btn" data-act="min"></button>' +
          '<button type="button" class="win__btn win__btn--close" data-act="close"></button>' +
        '</header>' +
        '<div class="win__body"></div>';

      el.querySelector('.win__glyph').textContent = app.glyph || '▣';
      el.querySelector('.win__title').textContent = app.title;
      const min = el.querySelector('[data-act="min"]');
      const close = el.querySelector('[data-act="close"]');
      min.textContent = '_';
      min.setAttribute('aria-label', 'Minimizar ' + app.title);
      close.textContent = '×';
      close.setAttribute('aria-label', 'Cerrar ' + app.title);

      min.addEventListener('click', () => this.minimize(app.id));
      close.addEventListener('click', () => this.close(app.id));
      el.addEventListener('pointerdown', () => this.focus(app.id));
      el.addEventListener('animationend', () => el.classList.remove('is-opening'));

      this.attachDrag(el, app.id);
      return el;
    }

    buildTaskButton(app) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'task';
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span aria-hidden="true"></span><span class="task__label"></span>';
      b.firstChild.textContent = app.glyph || '▣';
      b.querySelector('.task__label').textContent = app.title;
      b.addEventListener('click', () => this.toggleFromTask(app.id));
      return b;
    }

    attachDrag(el, id) {
      const bar = el.querySelector('.win__bar');
      let drag = null;

      bar.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const rec = this.windows.get(id);
        drag = { dx: e.clientX - rec.x, dy: e.clientY - rec.y };
        bar.setPointerCapture(e.pointerId);
        el.classList.add('is-dragging');
      });

      bar.addEventListener('pointermove', (e) => {
        if (!drag) return;
        this.moveTo(this.windows.get(id), e.clientX - drag.dx, e.clientY - drag.dy);
      });

      const end = (e) => {
        if (!drag) return;
        drag = null;
        el.classList.remove('is-dragging');
        if (bar.hasPointerCapture(e.pointerId)) bar.releasePointerCapture(e.pointerId);
      };
      bar.addEventListener('pointerup', end);
      bar.addEventListener('pointercancel', end);

      // Accesibilidad: mover con flechas (Shift = paso grande)
      bar.addEventListener('keydown', (e) => {
        const rec = this.windows.get(id);
        const s = e.shiftKey ? KEY_STEP * 3 : KEY_STEP;
        const d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
        if (!d) return;
        e.preventDefault();
        this.moveTo(rec, rec.x + d[0], rec.y + d[1]);
      });
    }

    moveTo(rec, x, y) {
      const { w: dw, h: dh } = this.bounds;
      const p = clampPosition(x, y, rec.el.offsetWidth, rec.el.offsetHeight, dw, dh);
      rec.x = p.x;
      rec.y = p.y;
      rec.el.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
    }

    reclampAll() {
      this.windows.forEach((rec) => {
        rec.el.style.maxHeight = Math.max(160, this.bounds.h - 16) + 'px';
        this.moveTo(rec, rec.x, rec.y);
      });
    }

    focus(id) {
      const rec = this.windows.get(id);
      if (!rec || rec.minimized) return;
      this.activeId = id;
      rec.el.style.zIndex = ++this.z;
      this.syncUi();
    }

    minimize(id) {
      const rec = this.windows.get(id);
      if (!rec || rec.minimized) return;
      rec.minimized = true;
      rec.el.hidden = true;
      if (this.activeId === id) this.activeId = this.topVisibleId();
      this.syncUi();
      this.announce('Ventana minimizada: ' + rec.app.title);
      rec.taskBtn.focus();
    }

    restore(id) {
      const rec = this.windows.get(id);
      if (!rec) return;
      if (rec.minimized) {
        rec.minimized = false;
        rec.el.hidden = false;
        rec.el.classList.add('is-opening');
      }
      this.focus(id);
      this.announce('Ventana activa: ' + rec.app.title);
    }

    close(id) {
      const rec = this.windows.get(id);
      if (!rec) return;
      rec.el.remove();
      rec.taskBtn.remove();
      this.windows.delete(id);
      if (this.activeId === id) this.activeId = this.topVisibleId();
      this.syncUi();
      this.announce('Ventana cerrada: ' + rec.app.title);
    }

    toggleFromTask(id) {
      const rec = this.windows.get(id);
      if (!rec) return;
      if (rec.minimized) this.restore(id);
      else if (this.activeId === id) this.minimize(id);
      else this.focus(id);
    }

    showDesktop() {
      const visible = [...this.windows.values()].filter((r) => !r.minimized);
      if (visible.length) {
        this.hiddenByDesktop = visible.map((r) => r.app.id);
        visible.forEach((r) => {
          r.minimized = true;
          r.el.hidden = true;
        });
        this.activeId = null;
        this.syncUi();
        this.announce('Escritorio despejado');
      } else {
        const ids = this.hiddenByDesktop.filter((id) => this.windows.has(id));
        ids.forEach((id) => {
          const r = this.windows.get(id);
          r.minimized = false;
          r.el.hidden = false;
        });
        this.hiddenByDesktop = [];
        if (ids.length) this.focus(ids[ids.length - 1]);
        this.syncUi();
        this.announce('Ventanas restauradas');
      }
    }

    topVisibleId() {
      let best = null, bestZ = -1;
      this.windows.forEach((r, id) => {
        const z = parseInt(r.el.style.zIndex || '0', 10);
        if (!r.minimized && z > bestZ) { best = id; bestZ = z; }
      });
      return best;
    }

    syncUi() {
      this.windows.forEach((r, id) => {
        const active = id === this.activeId;
        r.el.classList.toggle('is-active', active);
        r.taskBtn.classList.toggle('is-active', active);
        r.taskBtn.classList.toggle('is-min', r.minimized);
        r.taskBtn.setAttribute('aria-pressed', String(active));
      });
    }
  }

  window.IE = window.IE || {};
  window.IE.WindowManager = WindowManager;
  window.IE.clampPosition = clampPosition;
})();
