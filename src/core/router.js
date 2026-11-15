/**
 * Router por hash con mejora progresiva. No conoce las secciones: traduce la URL a una ruta y avisa.
 *
 *   ''                     → { world: 'landing' }
 *   '#cine'                → { world: 'cine' }
 *   '#cine-trabajos'       → { world: 'cine', section: 'cine-trabajos' }
 *   '#corporativo-contacto'→ { world: 'corporativo', section: 'corporativo-contacto' }
 *
 * Sin JS los mismos enlaces son anclas normales, así que todo sigue navegable.
 * @typedef {'landing'|'cine'|'corporativo'} World
 * @typedef {{ world: World, section: string|null, hash: string }} Route
 */

/** @returns {Route|null} null si el hash no pertenece al sitio (se deja al navegador). */
export function parseHash(hash) {
  const id = decodeURIComponent(String(hash).replace(/^#/, ''));
  if (!id) return { world: 'landing', section: null, hash: '' };
  const m = /^(cine|corporativo)(?:-(.+))?$/.exec(id);
  if (!m) return null;
  return { world: /** @type {World} */ (m[1]), section: m[2] ? id : null, hash: `#${id}` };
}

/** @param {{ onChange: (route: Route) => void }} options */
export function createRouter({ onChange }) {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  let lastUrl = location.href;
  const current = () => parseHash(location.hash) ?? parseHash('');

  function navigate(hash) {
    const route = parseHash(hash);
    if (!route) return;
    const url = route.hash ? route.hash : location.pathname + location.search;
    if (new URL(url, location.href).href !== location.href) history.pushState(null, '', url);
    lastUrl = location.href;
    onChange(route); // también si la URL no cambió: volver a pulsar "Trabajos" vuelve a desplazar
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = /** @type {Element} */ (e.target).closest?.('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!parseHash(href)) return;
    e.preventDefault();
    navigate(href);
  });

  // Atrás/Adelante y hashes escritos a mano (popstate y hashchange pueden llegar los dos)
  const onHistory = () => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    onChange(current());
  };
  window.addEventListener('popstate', onHistory);
  window.addEventListener('hashchange', onHistory);

  return { navigate, current };
}
