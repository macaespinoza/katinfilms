/**
 * Control de movimiento reducido.
 * En Windows, desactivar "Efectos de animación" del sistema activa `prefers-reduced-motion: reduce`
 * automáticamente en todos los navegadores, lo que dejaba el portafolio sin ninguna animación.
 * Por ello solo se desactivan las animaciones si se indica explícitamente `data-reduced-motion="true"` en `<html>`.
 */
export function prefersReducedMotion() {
  return document.documentElement.dataset.reducedMotion === 'true';
}
