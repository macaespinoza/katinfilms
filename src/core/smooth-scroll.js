import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';

let lenis = null;

/**
 * Lenis sincronizado con el ticker de GSAP: un único requestAnimationFrame para todo.
 * anchors: false porque las anclas las resuelve el router (src/core/router.js).
 */
export function initSmoothScroll({ enabled = true } = {}) {
  if (!enabled) return null;
  lenis = new Lenis({ lerp: 0.1, anchors: false });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export const getLenis = () => lenis;
