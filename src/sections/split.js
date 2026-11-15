import { gsap } from 'gsap';
import { ease, dur, expoOut, fontsReady, isPortraitPhone } from '../core/motion.js';
import { splitWords, textIn, wordsIn } from '../core/animations.js';
import { heroIn, heroOut, heroParts } from './hero.js';

/**
 * Pantalla dividida Cine / Corporativo: máquina de estados y transiciones.
 *
 * Estado en <html>:
 *   data-route = landing | cine | corporativo   (intención: cambia al empezar una transición)
 *   data-phase = stage | world                  (stage: mundos fijos y enmascarados; world: un mundo con scroll)
 *   data-lean  = cine | corporativo             (portada: la mitad que se mira; la línea se inclina hacia la otra)
 *   data-intro                                  (la intro al cargar sigue pendiente; lo pone el <head>)
 *
 * CSS (split.css) define dónde descansa la línea en cada ruta (--split / --strip-shift). Aquí no se
 * anima ese valor: se lee dónde está cada pieza, se cambia la ruta y cada pieza viaja hasta donde CSS
 * dice que debe quedar (travel, un FLIP con Web Animations). Así no hay estado duplicado entre CSS y
 * JS, el eje (horizontal en desktop, vertical en móvil) lo resuelve CSS sin que JS lo sepa, y el
 * viaje corre en el compositor: no se detiene aunque el hilo principal esté ocupado.
 *
 * Trabajo caro, fuera de los fotogramas que se ven:
 *  - El layout de las secciones del mundo que se abre (ready) se hace con la línea ya en marcha.
 *  - El cambio a la fase world (que reorganiza todo el layout) se hace cuando ya no se mueve nada.
 */

const WORLDS = /** @type {const} */ (['cine', 'corporativo']);

const TITLES = {
  landing: 'Katinfilms | Cine y producción audiovisual',
  cine: 'Cine | Katinfilms',
  corporativo: 'Corporativo | Katinfilms',
};
const THEME_COLOR = { landing: '#0c0212', cine: '#0c0212', corporativo: '#feffeb' };

/** Perforaciones que avanza la cinta en cada barrido (múltiplo del módulo para que no salte al limpiar). */
const FILM_FRAMES = 24;
/** Duración de la barra al entrar; la misma que las piezas del hero (hero.js). */
const HERO_DUR = 1;

/**
 * @param {{
 *   reduced?: boolean,
 *   lenis?: import('lenis').default | null,
 *   onActivate?: (world: 'cine'|'corporativo') => void,
 *   onDeactivate?: (world: 'cine'|'corporativo') => void,
 * }} options  onActivate / onDeactivate: un mundo queda (o deja de estar) a pantalla completa con scroll.
 */
export function initSplit({ reduced = false, lenis = null, onActivate = () => {}, onDeactivate = () => {} } = {}) {
  const root = document.documentElement;
  const worlds = Object.fromEntries(WORLDS.map((w) => [w, document.getElementById(w)]));
  const film = document.querySelector('[data-strip-film]');
  const lockup = document.querySelector('[data-lockup]');
  const marks = [...lockup.children].filter((el) => !el.classList.contains('sr-only')); // KATIN, placa, FILMS
  const covers = WORLDS.map((w) => worlds[w].querySelector('[data-cover]'));
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const navOf = (w) => worlds[w].querySelector('.world-nav');
  const titleOf = (w) => worlds[w].querySelector('.hero__title');
  const coverOf = (w) => worlds[w].querySelector('[data-cover]');
  const otherOf = (w) => (w === 'cine' ? 'corporativo' : 'cine');
  const route = () => root.dataset.route;

  /** Piezas cuya posición depende de --split / --strip-shift (split.css): máscaras, contenidos y cinta. */
  const movers = [
    ...WORLDS.flatMap((w) => [worlds[w].querySelector('.world__mask'), worlds[w].querySelector('.world__inner')]),
    document.querySelector('.strip-pos'),
    document.querySelector('.strip'),
  ];

  let busy = false;
  let pending = null;
  /** @type {gsap.core.Timeline|null} intro en curso (portada o mundo por enlace directo) */
  let intro = null;
  /** @type {Animation[]} viaje de la línea en curso */
  let travelling = [];

  /* ---------- Estado CSS ---------- */

  /** Curvas de la casa en formato Bézier compatible al 100 % con Web Animations API. */
  const curves = { out: 'cubic-bezier(0.16, 1, 0.3, 1)', inOut: 'cubic-bezier(0.87, 0, 0.13, 1)' };
  function curve(name) {
    return curves[name] || 'ease-out';
  }

  function stopTravel() {
    travelling.forEach((a) => a.cancel());
    travelling = [];
  }

  /**
   * Viaje de la línea (FLIP): lee dónde está cada pieza, aplica el cambio de estado y la anima desde
   * donde estaba hasta donde CSS dice que debe quedar. Solo transform, con Web Animations: corre en
   * el compositor, así que no pierde fotogramas aunque el hilo principal esté ocupado preparando el
   * mundo que entra. Parte de la posición actual, también si interrumpe un viaje anterior.
   * La fase debe ser stage antes de llamar (en world las piezas no tienen transform).
   * @param {() => void} change  cambia la ruta o la inclinación (data-route / data-lean)
   * @param {{ duration: number, ease: 'out'|'inOut', delay?: number }} options  en segundos
   * @returns {Promise<void>} se cumple al llegar (o si otro viaje lo interrumpe)
   */
  function travel(change, { duration, ease: name, delay = 0 }) {
    const from = movers.map((el) => getComputedStyle(el).transform);
    stopTravel();
    change();
    const to = movers.map((el) => getComputedStyle(el).transform);
    const timing = { duration: duration * 1000, delay: delay * 1000, easing: curve(name), fill: 'both' };
    // Mismo instante de partida para todas: máscara y contenido se contrarrestan fotograma a fotograma,
    // y el viaje va a la par del timeline de GSAP aunque el primer fotograma llegue tarde
    const startTime = document.timeline.currentTime;
    const anims = movers.flatMap((el, i) => {
      if (from[i] === to[i]) return [];
      const anim = el.animate({ transform: [from[i], to[i]] }, timing);
      if (startTime !== null) anim.startTime = startTime;
      return [anim];
    });
    travelling = anims;
    return Promise.all(anims.map((a) => a.finished)).then(
      // Al llegar, CSS vuelve a mandar (el valor es el mismo, pero en % y no en px: sigue al viewport)
      () => travelling === anims && stopTravel(),
      () => {} // interrumpido por un viaje nuevo
    );
  }

  /** Cambia la ruta. Devuelve el color de fondo de destino y deja fijado en línea el de origen. */
  function retarget(next) {
    const from = getComputedStyle(root).backgroundColor;
    delete root.dataset.lean;
    root.dataset.route = next;
    root.style.removeProperty('background-color');
    const to = getComputedStyle(root).backgroundColor;
    root.style.backgroundColor = from;
    return to;
  }

  function setPhase(phase) {
    root.dataset.phase = phase;
    if (phase === 'stage') lenis?.stop();
    else lenis?.start();
  }

  function finish(els) {
    stopTravel();
    root.style.removeProperty('background-color');
    gsap.set(els.filter(Boolean), { clearProps: 'all' });
  }

  /**
   * Con todo quieto: el mundo pasa a ocupar el documento (scroll normal) y se activan sus apariciones.
   * El orden importa para que el cambio de fase cueste un solo layout:
   *  1. Se limpia lo puesto en línea antes de cambiar de fase. La fase world deja al otro mundo sin
   *     caja (display: none), y GSAP, para limpiar un elemento sin caja, lo saca del DOM, lo mide y
   *     lo devuelve: un layout por elemento (medido: 6 layouts, ~100 ms).
   *  2. Después, todas las escrituras; al final, la única medida (el alto nuevo, para Lenis).
   */
  function open(world, els) {
    finish(els);
    setPhase('world');
    onActivate(world);
    lenis?.resize();
    titleOf(world).focus({ preventScroll: true });
  }

  /** Después de pintar el fotograma en curso: lo que se haga aquí ya no retrasa ese fotograma. */
  const afterFrame = (fn) => requestAnimationFrame(() => setTimeout(fn));

  /**
   * Da caja a las secciones de un mundo (split.css las deja sin ella hasta que se abre), de a una por
   * fotograma. Es el layout caro de abrir un mundo: se hace mientras la línea viaja en el compositor
   * y antes de que entre el hero, no en el clic (retrasaría la respuesta) ni al final (dejaría la
   * página sin responder justo cuando ya se puede usar).
   */
  function ready(world) {
    const rest = [...worlds[world].querySelectorAll('.world__inner > :not(.world-nav, .hero, [data-ready])')];
    const step = () => {
      rest.shift()?.setAttribute('data-ready', '');
      if (rest.length) afterFrame(step);
    };
    if (rest.length) afterFrame(step);
  }

  /** Promesa que se cumple cuando el timeline pasa por `time` (sin esperar a que termine entero). */
  const reach = (tl, time) => new Promise((resolve) => tl.call(resolve, undefined, time));

  /** Módulo de la cinta (una perforación). Tamaño de layout, sin transform: en la intro está a escala 0. */
  const filmModule = () => Math.min(film.offsetWidth, film.offsetHeight) / 2;

  /** La cinta "avanza" mientras se desplaza, como película pasando por la ventanilla. */
  function addFilm(tl, module, duration, position = 0, { frames = FILM_FRAMES, filmEase = ease.inOut } = {}) {
    tl.fromTo(film, { '--film': '0px' }, { '--film': `${-module * frames}px`, duration, ease: filmEase }, position);
  }

  /**
   * Desvanecimiento en el compositor (Web Animations, con la curva de tokens.css): la respuesta al
   * clic sigue fluida aunque el hilo principal esté ocupado preparando el mundo que entra.
   * @returns {Animation[]} cancelarlas al terminar devuelve el control a CSS
   */
  function fadeOut(els, duration) {
    const easing = curve('out');
    return els.map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duration * 1000, easing, fill: 'forwards' }));
  }

  /** "Rebobina" al inicio del mundo antes de cortar; con tope de duración aunque se esté muy abajo. */
  function rewind() {
    return new Promise((resolve) => {
      if (window.scrollY < 2) return resolve();
      if (!lenis) {
        window.scrollTo(0, 0);
        return resolve();
      }
      const duration = Math.min(0.9, 0.35 + window.scrollY / 5000);
      const done = () => {
        clearTimeout(safety);
        resolve();
      };
      const safety = setTimeout(() => {
        window.scrollTo(0, 0);
        done();
      }, (duration + 0.4) * 1000);
      lenis.scrollTo(0, { duration, easing: expoOut, lock: true, force: true, onComplete: done });
    });
  }

  function scrollToSection(id, { immediate = false } = {}) {
    const el = document.getElementById(id);
    if (!el || route() === 'landing') return;
    const offset = -navOf(route()).offsetHeight;
    if (lenis && !immediate) lenis.scrollTo(el, { offset, duration: dur.l, easing: expoOut });
    else window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + offset);
  }

  function scrollToTop() {
    if (lenis) lenis.scrollTo(0, { duration: dur.m + 0.1, easing: expoOut });
    else window.scrollTo(0, 0);
  }

  /* ---------- Portada ---------- */

  /**
   * Entrada de la portada: la placa del gato aparece y KATIN / FILMS salen de detrás de ella;
   * después, el título de cada mitad sube palabra por palabra y el resto del texto lo sigue.
   */
  function landingIn() {
    const [katin, plate, films] = marks;
    const behindPlate = (dir) => (isPortraitPhone() ? { yPercent: 70 * dir } : { xPercent: 22 * dir });
    const settle = () => ({ autoAlpha: 1, xPercent: 0, yPercent: 0, duration: dur.xl, ease: ease.out, clearProps: 'all' });
    const tl = gsap.timeline();
    tl.fromTo(plate, { autoAlpha: 0, scale: 0.82 }, { autoAlpha: 1, scale: 1, duration: dur.l, ease: ease.out, clearProps: 'all' }, 0)
      .fromTo(katin, { autoAlpha: 0, ...behindPlate(1) }, settle(), 0.12)
      .fromTo(films, { autoAlpha: 0, ...behindPlate(-1) }, settle(), 0.12);
    covers.forEach((cover, i) => {
      const t = 0.25 + i * 0.08;
      tl.add(wordsIn(cover.querySelector('[data-split]'), { layer: false }), t).add(
        textIn(cover.querySelectorAll('.cover__eyebrow, .cover__lede, .cover__cta'), { layer: false }),
        t + 0.15
      );
    });
    return tl;
  }

  /* ---------- Transiciones ---------- */

  /** Portada → mundo: la línea viaja hasta el margen opuesto y el mundo queda a pantalla completa. */
  function enter(world) {
    const W = worlds[world];
    const nav = navOf(world);
    // El hero del otro mundo no debe asomar mientras su portada se desvanece
    const otherParts = heroParts(worlds[otherOf(world)]);
    const module = filmModule();

    let bg;
    const arrived = travel(() => (bg = retarget(world)), { duration: dur.l, ease: 'inOut' });
    gsap.set([...covers, lockup], { autoAlpha: 1 });
    gsap.set([nav, ...otherParts], { autoAlpha: 0 });
    // La portada responde al clic al instante, antes de que la línea tome velocidad
    const fades = fadeOut([...covers, lockup], dur.s);
    ready(world);

    const tl = gsap.timeline();
    tl.to(root, { backgroundColor: bg, duration: 0.2, ease: 'none' }, 1.0)
      .add(heroIn(W), 0.6)
      .fromTo(nav, { autoAlpha: 0, yPercent: -100 }, { autoAlpha: 1, yPercent: 0, duration: HERO_DUR, ease: ease.out }, 0.75);
    addFilm(tl, module, dur.l);

    // El cambio de fase reorganiza todo el layout: se hace con todo quieto, al final
    return Promise.all([tl, arrived]).then(() => {
      fades.forEach((a) => a.cancel());
      open(world, [...covers, lockup, nav, film, ...otherParts]);
    });
  }

  /** Mundo → portada: rebobina, y la línea vuelve al centro. */
  async function leave(world) {
    await rewind();
    onDeactivate(world);
    const W = worlds[world];
    const nav = navOf(world);
    const parts = heroParts(W);
    const module = filmModule();

    gsap.killTweensOf(nav); // por si su entrada sigue en curso
    gsap.set([nav, ...parts], { autoAlpha: 1 });
    gsap.set([...covers, lockup], { autoAlpha: 0 });
    setPhase('stage'); // las piezas toman su posición de reposo en este mundo: de ahí parte el viaje

    const lineAt = 0.2;
    let bg;
    const arrived = travel(() => (bg = retarget('landing')), { duration: dur.l, ease: 'inOut', delay: lineAt });
    const tl = gsap.timeline();
    tl.to(nav, { autoAlpha: 0, yPercent: -100, duration: dur.s, ease: ease.in }, 0)
      .add(heroOut(W), 0)
      .to(root, { backgroundColor: bg, duration: 0.3, ease: 'none' }, lineAt)
      .set(lockup, { autoAlpha: 1 }, 0.9)
      .to(covers, { autoAlpha: 1, duration: dur.m, ease: ease.out, clearProps: 'all' }, 0.9)
      .add(landingIn(), 0.9);
    addFilm(tl, module, dur.l, lineAt);
    await Promise.all([reach(tl, lineAt + dur.l), arrived]);

    finish([lockup, nav, film, ...parts]);
    coverOf(world).focus({ preventScroll: true });
  }

  /** Mundo → mundo por el riel: rebobina y la línea barre la pantalla completa (un corte). */
  async function swap(from, to) {
    await rewind();
    onDeactivate(from);
    const navFrom = navOf(from);
    const module = filmModule();
    gsap.killTweensOf(navFrom);
    gsap.set(navFrom, { autoAlpha: 1 }); // sigue visible bajo la máscara hasta que el barrido la tape
    setPhase('stage'); // el mundo que entra recibe caja (solo su hero), aún fuera de la pantalla

    let bg;
    const arrived = travel(() => (bg = retarget(to)), { duration: dur.xl, ease: 'inOut' });
    ready(to);
    const tl = gsap.timeline();
    tl.to(root, { backgroundColor: bg, duration: 0.3, ease: 'none' }, 0.55).add(heroIn(worlds[to]), 0.6);
    addFilm(tl, module, dur.xl);
    await Promise.all([tl, arrived]); // el cambio de fase, con todo quieto
    open(to, [navFrom, film]);
  }

  /** Sin animación (movimiento reducido). */
  function jump(world) {
    const current = route();
    stopTravel();
    if (current !== 'landing') onDeactivate(current);
    delete root.dataset.lean;
    root.dataset.route = world;
    root.style.removeProperty('background-color');
    setPhase(world === 'landing' ? 'stage' : 'world');
    window.scrollTo(0, 0);
    if (world === 'landing') return;
    onActivate(world);
    titleOf(world).focus({ preventScroll: true });
  }

  async function run(target) {
    if (intro) intro.progress(1);
    root.removeAttribute('data-intro');
    const current = route();
    document.title = TITLES[target.world];
    if (themeMeta) themeMeta.content = THEME_COLOR[target.world];

    if (target.world !== current) {
      if (reduced) jump(target.world);
      else if (current === 'landing') await enter(target.world);
      else if (target.world === 'landing') await leave(current);
      else await swap(current, target.world);
    } else if (!target.section && current !== 'landing') {
      scrollToTop();
    }
    if (target.section) scrollToSection(target.section, { immediate: reduced });
  }

  /** Una transición a la vez; si llegan más rutas mientras tanto, solo se atiende la última. */
  function go(target) {
    if (busy) {
      pending = target;
      return;
    }
    busy = true;
    run(target)
      .catch((err) => console.error('[split]', err))
      .finally(() => {
        busy = false;
        if (pending) {
          const next = pending;
          pending = null;
          go(next);
        }
      });
  }

  /* ---------- Intros al cargar ---------- */

  /**
   * Las intros arrancan cuando la fuente ya cargó (init espera a fontsReady). Hasta entonces lo que
   * lleva texto no tiene caja (data-intro, split.css); quitar el atributo se la da, ya con su fuente,
   * y lo que sigue en la misma tarea fija los estados iniciales antes de que se pinte nada.
   * @returns {boolean} si la intro seguía pendiente. false: una navegación se adelantó, o la red de
   *   seguridad del <head> ya mostró el contenido (y entonces no se vuelve a esconder para animarlo).
   */
  function takeIntro() {
    const waiting = root.hasAttribute('data-intro');
    root.removeAttribute('data-intro');
    return waiting;
  }

  const introTimeline = () =>
    gsap.timeline({
      onComplete: () => {
        gsap.set(film, { clearProps: 'all' });
        intro = null;
      },
    });

  /** Portada: la cinta se dibuja mientras corre, como película que se enhebra; después, el logo y los textos. */
  function playIntro() {
    if (!takeIntro() || busy || route() !== 'landing') return;
    const module = filmModule();
    gsap.set(film, { '--draw': 0 });
    const tl = introTimeline();
    tl.to(film, { '--draw': 1, duration: dur.xl, ease: ease.inOut }, 0).add(landingIn(), 0.75);
    // Corre en el sentido en que se dibuja y frena con ella (12 módulos: no salta al limpiar)
    addFilm(tl, module, dur.xl + 0.6, 0, { frames: -12, filmEase: ease.out });
    intro = tl;
  }

  /** Mundo abierto por enlace directo: baja la barra, se dibuja el riel y entra el hero. */
  function playWorldIntro(world, section) {
    const animate = takeIntro();
    if (busy || route() !== world) return; // se navegó a otro mundo: esa transición activa el suyo
    onActivate(world); // estado inicial de las apariciones
    if (section) scrollToSection(section, { immediate: true });
    if (!animate) return;
    gsap.set(film, { '--draw': 0 });
    const tl = introTimeline();
    tl.fromTo(
      navOf(world),
      { autoAlpha: 0, yPercent: -100 },
      { autoAlpha: 1, yPercent: 0, duration: dur.l, ease: ease.out, clearProps: 'all' },
      0
    )
      .to(film, { '--draw': 1, duration: dur.xl, ease: ease.inOut }, 0)
      .add(heroIn(worlds[world]), 0.15);
    intro = tl;
  }

  /* ---------- Portada: inclinación ---------- */

  /** Mientras la intro espera o la cinta se dibuja, la línea no se inclina. */
  const drawing = () => root.hasAttribute('data-intro') || (intro !== null && intro.time() < dur.xl);

  /**
   * La línea se inclina hacia el lado que no se está mirando: anticipa el gesto de elegir.
   * @param {'cine'|'corporativo'|null} side  la mitad que se mira (null: vuelve al centro)
   */
  function lean(side) {
    if (reduced || busy || drawing() || route() !== 'landing') return;
    if ((root.dataset.lean ?? null) === side) return;
    travel(() => (side ? (root.dataset.lean = side) : delete root.dataset.lean), { duration: dur.l, ease: 'out' });
  }

  function bindLean() {
    covers.forEach((cover, i) => {
      const side = WORLDS[i];
      cover.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && lean(side));
      cover.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && lean(null));
      cover.addEventListener('focus', () => cover.matches(':focus-visible') && lean(side));
      cover.addEventListener('blur', () => lean(null));
    });
  }

  /** @param {import('../core/router.js').Route} initial */
  function init(initial) {
    document.title = TITLES[initial.world];
    if (themeMeta) themeMeta.content = THEME_COLOR[initial.world];
    bindLean();
    // Partir los títulos ahora y no en el clic: un cambio menos de DOM cuando empieza a moverse todo
    if (!reduced) document.querySelectorAll('[data-split]').forEach(splitWords);
    const animate = root.hasAttribute('data-intro');
    if (initial.world === 'landing') {
      lenis?.stop();
      if (animate) fontsReady().then(playIntro);
    } else if (animate) {
      fontsReady().then(() => playWorldIntro(initial.world, initial.section));
    } else {
      onActivate(initial.world);
      if (initial.section) document.fonts.ready.then(() => scrollToSection(initial.section, { immediate: true }));
    }
  }

  return { go, init };
}
