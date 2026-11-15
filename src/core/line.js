/**
 * Línea viajera: un único subrayado que se desplaza entre los elementos de un grupo (barra
 * superior, filtros). Aparece dibujándose desde la izquierda, viaja de un elemento a otro y se
 * retira hacia la derecha. Es el mismo gesto de la cinta entre mundos, en pequeño.
 *
 * Solo transform; la duración y la curva viven en CSS (.line en main.css), así el movimiento
 * reducido la deja quieta sin código extra.
 *
 * @param {HTMLElement} container  ancestro posicionado de los elementos
 * @param {HTMLElement[]} items    elementos que puede marcar (se observan por si cambian de tamaño)
 */
export function createLine(container, items) {
  const line = document.createElement('span');
  line.className = 'line';
  line.setAttribute('aria-hidden', 'true');
  container.append(line);

  /** @type {HTMLElement|null} */
  let target = null;
  let shown = false;

  /** Borde inferior del contenido del elemento (sin su padding), relativo al contenedor. */
  function geometry(el) {
    const c = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const padBottom = parseFloat(getComputedStyle(el).paddingBottom) || 0;
    return { x: r.left - c.left, y: r.bottom - c.top - padBottom, w: r.width };
  }

  const apply = ({ x, y, w }) => {
    line.style.transform = `translate3d(${x}px, ${y}px, 0) scaleX(${w / 100})`;
  };

  /** Coloca sin transición (aparición, cambios de tamaño). */
  function snap(g) {
    line.classList.add('line--snap');
    apply(g);
    line.getBoundingClientRect(); // fija el estado antes de devolver la transición
    line.classList.remove('line--snap');
  }

  function hide() {
    if (shown && target) {
      const g = geometry(target);
      apply({ x: g.x + g.w, y: g.y, w: 0 });
    }
    shown = false;
    target = null;
  }

  function moveTo(el) {
    if (!el) return hide();
    target = el;
    const g = geometry(el);
    if (!g.w) return; // sin layout todavía (mundo oculto): el ResizeObserver la colocará
    if (!shown) {
      snap({ ...g, w: 0 }); // aparece en su sitio, dibujándose desde la izquierda
      shown = true;
    }
    apply(g);
  }

  const ro = new ResizeObserver(() => {
    if (!target) return;
    const g = geometry(target);
    if (!g.w) return;
    snap(g);
    shown = true;
  });
  [container, ...items].forEach((el) => ro.observe(el));

  return {
    moveTo,
    hide,
    dispose() {
      ro.disconnect();
      line.remove();
    },
  };
}
