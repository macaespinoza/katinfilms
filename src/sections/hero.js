import { gsap } from 'gsap';
import { ease, dur } from '../core/motion.js';
import { frameIn, textIn, wordsIn } from '../core/animations.js';

/** Piezas del hero, en orden de lectura (marco del showreel, título, textos). */
export const heroParts = (worldEl) => [...worldEl.querySelectorAll('.hero__content [data-hero-part]')];

/**
 * Algo más breve que una aparición al hacer scroll: el mundo no se puede usar hasta que el hero
 * termina (split.js hace el cambio de fase con todo quieto).
 */
const DURATION = 1;

/**
 * Entrada del hero, escalonada en orden de lectura. Cada pieza entra a su manera: el showreel se
 * abre como un corte, el título sube palabra por palabra ([data-split]) y el resto sube y aparece.
 * Cada animación limpia sus estilos al terminar.
 */
export function heroIn(worldEl) {
  const world = worldEl.dataset.world;
  const tl = gsap.timeline();
  heroParts(worldEl).forEach((part, i) => {
    const at = i * 0.1;
    if (part.hasAttribute('data-showreel')) tl.add(frameIn(part, world, { duration: DURATION, layer: false }), at);
    else if (part.hasAttribute('data-split')) tl.add(wordsIn(part, { duration: DURATION, layer: false }), at);
    else tl.add(textIn(part, { duration: DURATION, layer: false }), at);
  });
  return tl;
}

/** Salida del hero al volver a la portada. Pisa lo que quede de una entrada en curso. */
export function heroOut(worldEl) {
  return gsap.to(heroParts(worldEl), {
    autoAlpha: 0,
    y: -16,
    duration: dur.s * 0.8,
    stagger: { each: 0.05, from: 'end' },
    ease: ease.in,
    overwrite: 'auto',
  });
}
