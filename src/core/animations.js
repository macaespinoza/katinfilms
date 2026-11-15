import { gsap } from 'gsap';
import { ease, dur, STAGGER, isPortraitPhone } from './motion.js';

/**
 * Apariciones. Tres tipos, declarados en el HTML con data-reveal:
 *   text (por defecto)  sube 24 px mientras aparece
 *   title               cada palabra sube desde detrás de una máscara
 *   frame               una compuerta del color del fondo se retira en la misma dirección en que
 *                       viajó la línea al abrir el mundo, y la imagen se asienta (1.12 → 1)
 *
 * Nada se oculta en CSS: el estado inicial lo pone JS al activar un mundo. Sin JS, o con
 * movimiento reducido, todo está visible desde el principio.
 */

const MEDIA = ':scope > img, :scope > video';
/** % de la altura de una palabra que baja para esconderse: con la holgura de .word, deja fuera tildes y descendentes. */
const WORD_SHIFT = 135;
const TEXT_FROM = { autoAlpha: 0, y: 24 };

/* ---------- Capas ----------
 * Lo que se va a animar recibe capa propia (will-change) antes de moverse y vuelve a la capa común
 * solo con todo quieto: crear y deshacer capas a mitad de una animación obliga a re-rasterizar y
 * da tirones en GPUs modestas (medido: el scroll pasaba de 13 a 3 fotogramas lentos). Volver a la
 * capa común devuelve al texto su suavizado normal.
 */

const layered = new Set();
let running = 0;
let releaseTimer = 0;

function promote(els, props = 'transform, opacity') {
  for (const el of gsap.utils.toArray(els)) {
    el.style.willChange = props;
    layered.add(el);
  }
}

/** Devuelve a la capa común lo que ya apareció (lo pendiente conserva su capa hasta animarse). */
function release() {
  for (const el of layered) {
    if (el.closest('[data-reveal-state="pending"]')) continue;
    el.style.willChange = '';
    layered.delete(el);
  }
}

/** Libera cuando no hay animaciones y el scroll lleva un momento quieto. */
function scheduleRelease() {
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => running === 0 && release(), 500);
}
addEventListener('scroll', () => layered.size && scheduleRelease(), { passive: true });

/** Cuenta la animación como activa mientras dura (también si se interrumpe). */
function tracked(vars) {
  running++;
  let open = true;
  const end = () => {
    if (!open) return;
    open = false;
    running--;
    if (running === 0) scheduleRelease();
  };
  const { onComplete } = vars;
  return {
    ...vars,
    onComplete() {
      onComplete?.();
      end();
    },
    onInterrupt: end,
  };
}

/* ---------- Palabras ---------- */

const split = new WeakMap();

/**
 * Envuelve cada palabra de un texto plano en una máscara (.word > span). Idempotente.
 * Los lectores de pantalla leen una copia .sr-only; las palabras visibles van aria-hidden.
 * @returns {HTMLElement[]|null} los span que se animan, o null si el elemento no es texto plano
 */
export function splitWords(el) {
  if (split.has(el)) return split.get(el);
  if (el.children.length) return null;

  const text = el.textContent.trim().replace(/\s+/g, ' ');
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  const words = text.split(' ').map((word, i) => {
    const mask = document.createElement('span');
    mask.className = 'word';
    const inner = Object.assign(document.createElement('span'), { textContent: word });
    mask.append(inner);
    visual.append(...(i ? [' ', mask] : [mask]));
    return inner;
  });
  el.replaceChildren(Object.assign(document.createElement('span'), { className: 'sr-only', textContent: text }), visual);
  split.set(el, words);
  return words;
}

/**
 * Entrada de texto simple: sube y aparece.
 * layer: false durante los viajes de la línea (hero, portada): una capa nueva dentro del mundo que
 * se desplaza cuesta más de lo que ahorra (medido).
 */
export function textIn(targets, { delay = 0, stagger = STAGGER, duration = dur.l, layer = true } = {}) {
  if (layer) promote(targets);
  return gsap.fromTo(
    targets,
    TEXT_FROM,
    tracked({ autoAlpha: 1, y: 0, duration, ease: ease.out, delay, stagger, clearProps: 'opacity,visibility,transform' })
  );
}

/** Entrada de un título: las palabras suben desde su máscara. Si no es texto plano, entra como texto. */
export function wordsIn(el, { delay = 0, duration = dur.l, layer = true } = {}) {
  const words = splitWords(el);
  if (!words) return textIn(el, { delay, duration, layer });
  if (layer) promote(words, 'transform');
  return gsap.fromTo(
    words,
    { yPercent: WORD_SHIFT },
    tracked({ yPercent: 0, duration, ease: ease.out, stagger: 0.06, delay, clearProps: 'transform' })
  );
}

/* ---------- Marcos ---------- */

function gateOf(frame) {
  let gate = frame.querySelector(':scope > .gate');
  if (!gate) {
    gate = document.createElement('span');
    gate.className = 'gate';
    gate.setAttribute('aria-hidden', 'true');
    frame.append(gate);
  }
  return gate;
}

/**
 * Dirección del barrido: la del corte que abrió el mundo. Cine se abrió hacia la derecha
 * (hacia abajo en móvil vertical); Corporativo hacia la izquierda (hacia arriba).
 */
function sweep(world) {
  const forward = world === 'cine';
  return isPortraitPhone()
    ? { prop: 'scaleY', origin: forward ? '50% 100%' : '50% 0%' }
    : { prop: 'scaleX', origin: forward ? '100% 50%' : '0% 50%' };
}

/**
 * Abre un marco: la compuerta se retira como un pequeño corte y la imagen se asienta.
 * (El marco no se promueve aquí: en el hero, una capa nueva dentro del mundo que se está
 * desplazando costaba fotogramas a mitad del viaje de la línea. Las apariciones lo promueven antes.)
 */
export function frameIn(frame, world, { delay = 0, duration = dur.m + 0.2, layer = true } = {}) {
  const gate = gateOf(frame);
  const media = frame.querySelectorAll(MEDIA);
  const { prop, origin } = sweep(world);
  const tl = gsap.timeline(tracked({ delay, onComplete: () => gate.remove() }));
  tl.fromTo(gate, { [prop]: 1, transformOrigin: origin }, { [prop]: 0, duration, ease: ease.inOut }, 0);
  if (media.length) {
    if (layer) promote(media, 'transform');
    // La imagen se asienta algo más despacio que la compuerta: la cola larga se nota como calma
    tl.fromTo(media, { scale: 1.12 }, { scale: 1, duration: duration * 1.6, ease: ease.out, clearProps: 'transform' }, 0);
  }
  return tl;
}

/* ---------- Apariciones al hacer scroll ---------- */

const kindOf = (el) => el.dataset.reveal || 'text';

/**
 * Controlador de apariciones de un mundo. Se activa cuando el mundo queda a pantalla completa y se
 * desactiva al salir de él (src/sections/split.js → onActivate/onDeactivate).
 * Los elementos que entran juntos en pantalla se escalonan en orden de lectura.
 */
export function createReveals({ reduced = false } = {}) {
  let io = null;
  let world = null;

  /**
   * Estado inicial de todo lo que va a aparecer, ya en su capa: la aparición empieza sin crear capas.
   * Los marcos quedan tapados por su compuerta y van en capa propia, así la compuerta se mueve encima
   * sin obligar a re-rasterizar su fondo y su grano (medido: sin esto, cada apertura durante el
   * scroll costaba fotogramas de 80-100 ms en una GPU integrada).
   *
   * En tres pasadas: DOM, capas, estilos. GSAP lee el estilo calculado de cada elemento al fijarle un
   * transform; hacerlo elemento por elemento, intercalado con los cambios de DOM, forzaba un layout
   * por título y por marco justo al abrir el mundo (medido: 6 layouts, ~100 ms; así es uno).
   */
  function prepare(els) {
    const text = [];
    const words = [];
    const frames = [];
    for (const el of els) {
      el.dataset.revealState = 'pending';
      const kind = kindOf(el);
      const parts = kind === 'title' ? splitWords(el) : null;
      if (kind === 'frame') {
        gateOf(el);
        frames.push(el);
      } else if (parts) words.push(...parts);
      else text.push(el);
    }
    const media = frames.flatMap((frame) => [...frame.querySelectorAll(MEDIA)]);

    promote(text);
    promote([...words, ...frames, ...media], 'transform');

    if (text.length) gsap.set(text, TEXT_FROM);
    if (words.length) gsap.set(words, { yPercent: WORD_SHIFT });
    if (media.length) gsap.set(media, { scale: 1.12 });
  }

  function play(el, delay) {
    el.dataset.revealState = 'done';
    const kind = kindOf(el);
    if (kind === 'frame') frameIn(el, world, { delay });
    else if (kind === 'title') wordsIn(el, { delay });
    else textIn(el, { delay });
  }

  function onIntersect(entries) {
    const entering = entries
      .filter((e) => e.isIntersecting && e.target.dataset.revealState === 'pending')
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
      .map((e) => e.target);
    // El escalonado total no pasa de ~0,5 s aunque entren muchos a la vez
    const step = Math.min(STAGGER, 0.48 / entering.length);
    entering.forEach((el, i) => {
      io.unobserve(el);
      play(el, i * step);
    });
  }

  function deactivate(name) {
    io?.disconnect();
    io = null;
    world = null;
    const root = document.getElementById(name);
    if (root) settle(root);
  }

  function activate(name) {
    if (reduced) return;
    if (world) deactivate(world);
    world = name;
    // Un elemento filtrado (display: none) sigue observado y aparece cuando vuelve a mostrarse
    io = new IntersectionObserver(onIntersect, { rootMargin: '0px 0px -8% 0px' });
    const els = [...document.getElementById(name).querySelectorAll('[data-reveal]')];
    prepare(els);
    els.forEach((el) => io.observe(el));
  }

  return { activate, deactivate };
}

/** Deja visible al instante, y en la capa común, todo lo pendiente o a medio aparecer dentro de root. */
function settle(root) {
  root.querySelectorAll('[data-reveal-state]').forEach((el) => {
    const parts = [el, ...el.querySelectorAll('.word > span, :scope > .gate, :scope > img, :scope > video')];
    gsap.killTweensOf(parts);
    gsap.set(parts, { clearProps: 'opacity,visibility,transform,willChange' });
    parts.forEach((p) => layered.delete(p));
    el.querySelector(':scope > .gate')?.remove();
    delete el.dataset.revealState;
  });
}
