import { prefersReducedMotion } from './core/motion-prefs.js';
import { initSmoothScroll } from './core/smooth-scroll.js';
import { createRouter } from './core/router.js';
import { createReveals } from './core/animations.js';
import { initWork } from './sections/work.js';
import { initNav } from './sections/nav.js';
import { initSplit } from './sections/split.js';

const reduced = prefersReducedMotion();
const lenis = initSmoothScroll({ enabled: !reduced });
const reveals = createReveals({ reduced });

initWork({ world: 'cine', reduced });
initWork({ world: 'corporativo', reduced });
const nav = initNav();
const split = initSplit({
  reduced,
  lenis,
  // Un mundo queda a pantalla completa (o deja de estarlo): apariciones al hacer scroll y sección activa en la barra
  onActivate: (world) => {
    reveals.activate(world);
    nav.activate(world);
  },
  onDeactivate: (world) => {
    reveals.deactivate(world);
    nav.deactivate(world);
  },
});

const router = createRouter({
  onChange: (route) => {
    nav.closeAll();
    split.go(route);
  },
});
split.init(router.current());
