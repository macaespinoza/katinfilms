import { gsap } from 'gsap';
import { ease, dur } from '../core/motion.js';
import { createLine } from '../core/line.js';
import { projects, categories } from '../data/projects.js';

const canHover = () => window.matchMedia('(hover: hover)').matches;

/**
 * Flip solo hace falta al filtrar: se descarga aparte (~9 KB gzip menos en la carga inicial), en
 * cuanto el cursor, el dedo o el foco llegan a los filtros.
 * @type {Promise<typeof import('gsap/Flip').Flip>|undefined}
 */
let flip;
const loadFlip = () =>
  (flip ??= import('gsap/Flip').then(({ Flip }) => {
    gsap.registerPlugin(Flip);
    return Flip;
  }));

/**
 * Renderiza los trabajos de un mundo y sus filtros por categoría.
 * Cine: una película por fila, marco 2.39:1. Corporativo: grilla de marcos 16:9.
 * @param {{ world: 'cine'|'corporativo', reduced?: boolean }} options
 */
export function initWork({ world, reduced = false }) {
  const grid = document.querySelector(`[data-work-grid="${world}"]`);
  if (!grid) return;

  const items = projects.filter((p) => p.world === world);
  const lis = items.map(world === 'cine' ? renderFilm : renderJob);
  grid.replaceChildren(...lis);

  const filters = document.querySelector(`[data-work-filters="${world}"]`);
  if (!filters) return;
  const present = [...new Set(items.map((p) => p.category))];
  if (present.length < 2) {
    filters.hidden = true;
    return;
  }

  const buttons = [['*', 'Todo'], ...present.map((c) => [c, categories[c].plural])].map(([value, label]) =>
    el('button', {
      type: 'button',
      className: 'filter',
      textContent: label,
      dataset: { filter: value },
      ariaPressed: String(value === '*'),
    })
  );
  filters.replaceChildren(...buttons);
  // El filtro activo lo marca una línea que viaja al elegir otro (la misma de la barra superior)
  const line = createLine(filters, buttons);
  line.moveTo(buttons[0]);

  if (!reduced) {
    const warm = () => loadFlip().catch(() => {});
    ['pointerenter', 'touchstart', 'focusin'].forEach((type) => filters.addEventListener(type, warm, { once: true, passive: true }));
  }

  filters.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement} */ (e.target).closest('.filter');
    if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    line.moveTo(btn);
    applyFilter(lis, btn.dataset.filter, reduced);
  });
}

/**
 * Reordenamiento animado con Flip: movimiento que responde a la acción, no decoración.
 * Los trabajos que vuelven a mostrarse y aún no habían aparecido siguen observados por las
 * apariciones (src/core/animations.js), así que sus marcos se abren al entrar en pantalla.
 * Si Flip no llega a cargar (sin red), el filtro se aplica igual, sin animación.
 */
function applyFilter(lis, value, reduced) {
  const toggle = () => lis.forEach((li) => li.classList.toggle('is-out', value !== '*' && li.dataset.category !== value));
  if (reduced) return toggle();
  loadFlip().then((Flip) => {
    const state = Flip.getState(lis);
    toggle();
    Flip.from(state, {
      duration: dur.m,
      ease: ease.out,
      absolute: true,
      onEnter: (els) =>
        gsap.fromTo(els, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: dur.m, ease: ease.out, clearProps: 'all' }),
      onLeave: (els) => gsap.to(els, { autoAlpha: 0, scale: 0.97, duration: dur.s * 0.7, ease: ease.in }),
    });
  }, toggle);
}

/* ---------- Plantillas ---------- */

function renderFilm(p) {
  const li = el('li', { className: 'film-item', dataset: { category: p.category } });
  const tagText = [categories[p.category]?.singular, p.year].filter(Boolean).join(' · ');
  const info = el('div', { className: 'film__info', dataset: { reveal: '' } }, [
    el('div', { className: 'film__header' }, [
      el('span', { className: 'film__tag', textContent: tagText }),
      el('h3', { className: 'film__title', textContent: p.title }),
    ]),
    p.summary && el('p', { className: 'film__summary', textContent: p.summary }),
    meta([
      ['Formato', p.duration || categories[p.category]?.singular],
      ['Género', p.genre],
      ['Estado', p.status],
      ['Créditos', p.role],
    ]),
  ]);
  li.append(el('article', { className: 'film' }, [frame(p, 'frame--scope', li), info]));
  return li;
}

function renderJob(p) {
  const li = el('li', { className: 'job-item', dataset: { category: p.category } });
  li.append(
    el('article', { className: 'job' }, [
      frame(p, 'frame--wide', li),
      el('div', { className: 'job__info', dataset: { reveal: '' } }, [
        el('div', { className: 'job__header' }, [
          el('span', { className: 'job__tag', textContent: `${p.client} · ${p.year}` }),
          el('h3', { className: 'job__title', textContent: p.title }),
        ]),
        p.summary && el('p', { className: 'job__summary', textContent: p.summary }),
        meta([
          ['Cliente', p.client],
          ['Servicio', p.badge || categories[p.category].singular],
        ]),
      ]),
    ])
  );
  return li;
}

/** Marco con poster, preview en video (solo si existen) o placeholder. Se abre al entrar en pantalla. */
function frame(p, ratioClass, hoverTarget) {
  const box = el('div', { className: `frame ${ratioClass}`, dataset: { reveal: 'frame' } });
  if (p.poster) {
    box.append(el('img', { className: 'frame__img', src: p.poster, alt: p.title || '', loading: 'lazy', decoding: 'async' }));
  } else {
    box.append(el('p', { className: 'frame__label', textContent: 'Imagen pendiente' }));
  }

  if (p.logo) {
    const badge = el('div', { className: 'frame__client-badge' }, [
      el('img', { src: p.logo, alt: p.client || '', loading: 'lazy', decoding: 'async' }),
    ]);
    box.append(badge);
  }

  if (p.preview) {
    const video = el('video', { src: p.preview, muted: true, loop: true, playsInline: true, preload: 'none' });
    if (p.poster) video.poster = p.poster;
    box.append(video);
    if (canHover()) {
      hoverTarget.addEventListener('pointerenter', () => video.play().catch(() => {}));
      hoverTarget.addEventListener('pointerleave', () => video.pause());
    } else {
      new IntersectionObserver(([e]) => (e.isIntersecting ? video.play().catch(() => {}) : video.pause()), {
        threshold: 0.6,
      }).observe(box);
    }
  }
  return box;
}

function meta(rows) {
  return el(
    'dl',
    { className: 'meta' },
    rows.filter(([, v]) => v).map(([k, v]) => el('div', {}, [el('dt', { textContent: k }), el('dd', { textContent: v })]))
  );
}

function el(tag, props = {}, children = []) {
  const { dataset, ariaPressed, ...rest } = props;
  const node = Object.assign(document.createElement(tag), rest);
  if (dataset) Object.assign(node.dataset, dataset);
  if (ariaPressed) node.setAttribute('aria-pressed', ariaPressed);
  node.append(...children.filter(Boolean));
  return node;
}
