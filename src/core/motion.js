/**
 * Tokens de movimiento. Fuente única para GSAP; tokens.css tiene el espejo para CSS
 * (--ease-out, --ease-in-out, --dur-*), con la misma curva exacta vía linear().
 *
 * Curva de la casa: exponencial. Recorre casi todo el camino al principio y se asienta con una
 * cola larga y suave (la sensación "logarítmica"): responde al instante y nunca frena en seco.
 */
export const ease = {
  /** Entradas, hovers y respuestas a una acción. */
  out: 'expo.out',
  /** Viajes de un estado a otro: la línea entre mundos, el barrido de los marcos. */
  inOut: 'expo.inOut',
  /** Salidas breves: lo que se va no necesita cola. */
  in: 'power2.in',
};

/** Duraciones en segundos (en CSS, --dur-xs … --dur-l en ms). */
export const dur = { xs: 0.2, s: 0.45, m: 0.8, l: 1.2, xl: 1.4 };

/** Escalonado entre elementos hermanos. */
export const STAGGER = 0.08;

/** expo.out como función, para APIs que no hablan GSAP (Lenis). */
export const expoOut = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/** Móvil vertical: la pantalla dividida corre en el eje Y. Mismo media query que split.css. */
export const isPortraitPhone = () => window.matchMedia('(max-width: 720px) and (orientation: portrait)').matches;

/**
 * Espera a que cargue la fuente del cuerpo (con tope) antes de animar texto, para que no cambie
 * de métrica a mitad de una entrada.
 */
export function fontsReady(timeout = 400) {
  const family = getComputedStyle(document.body).fontFamily;
  const load = document.fonts ? document.fonts.load(`700 1em ${family}`).catch(() => {}) : Promise.resolve();
  return Promise.race([load, new Promise((resolve) => setTimeout(resolve, timeout))]);
}
