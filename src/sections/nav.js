import { createLine } from '../core/line.js';

/**
 * Barra superior de cada mundo.
 *  - Escritorio: una línea viajera marca la sección en pantalla y sigue al cursor o al foco.
 *  - Pantallas angostas (≤ 720px, ver main.css): menú desplegable; la sección en pantalla va subrayada.
 * La sección en pantalla se marca también con aria-current.
 */
export function initNav() {
  const bars = new Map(
    [...document.querySelectorAll('.world-nav')].map((nav) => [nav.closest('[data-world]').dataset.world, createBar(nav)])
  );
  let stopWatching = null;

  return {
    closeAll: () => bars.forEach((bar) => bar.setOpen(false)),
    /** El mundo queda a pantalla completa: empieza a seguir la sección en pantalla. */
    activate(world) {
      stopWatching?.();
      stopWatching = watchSections(world, (id) => bars.get(world)?.setCurrent(id));
    },
    deactivate(world) {
      stopWatching?.();
      stopWatching = null;
      bars.get(world)?.setCurrent(null);
    },
  };
}

function createBar(nav) {
  const toggle = nav.querySelector('.world-nav__toggle');
  const list = nav.querySelector('.world-nav__links');
  const links = [...list.querySelectorAll('a')];
  const line = createLine(nav, links);
  let current = null;
  let hovered = null;
  let focused = null;

  // Prioridad: lo que se apunta, lo que tiene el foco del teclado, la sección en pantalla
  const sync = () => line.moveTo(hovered ?? focused ?? current);

  links.forEach((a) => {
    a.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      hovered = a;
      sync();
    });
    a.addEventListener('focus', () => {
      if (!a.matches(':focus-visible')) return;
      focused = a;
      sync();
    });
    a.addEventListener('blur', () => {
      if (focused !== a) return;
      focused = null;
      sync();
    });
  });
  list.addEventListener('pointerleave', () => {
    hovered = null;
    sync();
  });

  const setOpen = (open) => {
    nav.toggleAttribute('data-open', open);
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Cerrar' : 'Menú';
  };

  toggle?.addEventListener('click', () => setOpen(!nav.hasAttribute('data-open')));
  nav.addEventListener('click', (e) => {
    if (/** @type {Element} */ (e.target).closest('.world-nav__links a')) setOpen(false);
  });
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !nav.hasAttribute('data-open')) return;
    setOpen(false);
    toggle?.focus();
  });

  return {
    setOpen,
    /** @param {string|null} id  id de la sección en pantalla */
    setCurrent(id) {
      current = (id && links.find((a) => a.getAttribute('href') === `#${id}`)) || null;
      links.forEach((a) => (a === current ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      sync();
    },
  };
}

/**
 * Sección en pantalla: la que cruza una franja estrecha a ~40 % del alto de la ventana.
 * Con el pie a la vista, la última (Contacto puede ser demasiado corta para llegar a la franja).
 * @returns {() => void} deja de observar
 */
function watchSections(world, onChange) {
  const W = document.getElementById(world);
  const sections = [...W.querySelectorAll('.section[id]')];
  const footer = W.querySelector('.world-footer');
  const inBand = new Set();
  let atEnd = false;
  let last;

  const update = () => {
    const section = atEnd ? sections.at(-1) : sections.filter((s) => inBand.has(s)).at(-1);
    const id = section?.id ?? null;
    if (id !== last) onChange((last = id));
  };

  const band = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => (e.isIntersecting ? inBand.add(e.target) : inBand.delete(e.target)));
      update();
    },
    { rootMargin: '-38% 0px -58% 0px' }
  );
  const end = new IntersectionObserver(
    ([e]) => {
      atEnd = e.isIntersecting;
      update();
    },
    { threshold: 1 }
  );
  sections.forEach((s) => band.observe(s));
  if (footer) end.observe(footer);

  return () => {
    band.disconnect();
    end.disconnect();
  };
}
