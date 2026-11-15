# Katinfilms Web — Especificación

> Estado: **v0.2 — dos mundos con placeholders**. Este documento define *qué* se construye y *con qué reglas*.
> Las decisiones abiertas están marcadas como **[ABIERTO]**.

## 1. Objetivo

Portafolio de Katinfilms, la marca de Catalina, cineasta y realizadora audiovisual. Su trabajo
se mueve entre **dos mundos**, y el sitio los separa desde la entrada:

- **Cine**: cortometrajes animados y largometrajes documentales.
- **Corporativo**: publicidad, video corporativo, comunicación interna y fotografía.

Al entrar, la pantalla aparece dividida en dos mitades (Cine a la izquierda, Corporativo a la derecha).
Al elegir una, la línea divisoria viaja hasta el margen opuesto y el mundo elegido queda a pantalla
completa, con su hero y su barra superior (Trabajos, Nosotras, Contacto).

**Criterio de éxito:** un programador de festival o un cliente corporativo llega, entiende en
menos de 10 s cuál de los dos mundos le corresponde, ve al menos un trabajo y encuentra el
contacto sin fricción, también desde el móvil.

### 1.1 Identidad visual
- **Paleta** (`src/styles/tokens.css`): purple `#5b118c`, orange `#fd830c`, yellow `#fbffbb`,
  ink `#0c0212`, cream `#feffeb`. Cine es oscuro (texto yellow sobre ink); Corporativo es claro
  (texto ink y títulos purple sobre cream). Todos los pares de texto cumplen ≥ 4.5:1 (el mínimo
  medido es 9.3:1). **Nunca** se usa orange como texto sobre cream (2.5:1) ni purple sobre ink (1.8:1).
- **El corte:** el divisor es una cinta de película perforada naranja (retoma la cinta del logo).
  Ya dentro de un mundo, queda estacionada como **riel** en el borde opuesto y lleva al otro mundo.
- **Tipografía:** Montserrat Variable autoalojada, como sustituta de Panton (la versión de prueba
  no tiene licencia web). Se cambia en `--font-sans`. [ABIERTO] ¿licencia web de Panton?
- **Logo:** SVG trazados en `public/media/brand/` (gato y wordmark), insertados como sprite inline
  en `index.html` y coloreados con `currentColor`. En Cine, los retratos llevan un tritono
  ink → purple → cream (`#duo-cine`).

## 2. Stack

| Capa | Herramienta | Por qué |
|---|---|---|
| Runtime / tooling | **Node ≥ 20** + **Vite 8** | Servidor de desarrollo instantáneo, build optimizado, code-splitting con `import()` dinámico. |
| Lenguaje | **JavaScript vanilla (ES modules)** + JSDoc para tipos | Sin framework: menos peso, control total del DOM para animaciones. Migrable a TS sin reestructurar. |
| Animación | **GSAP 3** (+ **Flip** para los filtros) | Estándar de la industria para timelines. Gratuito con todos sus plugins (ScrollTrigger, SplitText, Flip, MorphSVG); hoy solo se usa Flip, que se descarga aparte al acercarse a los filtros. El viaje de la línea no usa GSAP: va con Web Animations, en el compositor (§3). |
| Tipografía | `@fontsource-variable/montserrat` | Fuente autoalojada: sin peticiones a terceros; solo se descarga el subconjunto latino. |
| Scroll suave | **Lenis** (~3 KB) | Scroll con inercia, sincronizado con el ticker de GSAP: un solo `requestAnimationFrame`. |
| 3D | **Three.js** (carga diferida) | Escenas WebGL y modelos `.glb`. Se descarga **solo** cuando un canvas 3D entra en pantalla. |
| IA (opcional) | `@openrouter/sdk` | Ya instalado. **Solo del lado servidor** (ver §8). |

**Descartado por ahora:** React/Next (peso y complejidad innecesarios para un sitio de una
página), React Three Fiber (requiere React), Barba.js (no hace falta mientras sea one-page).

## 3. Estructura del proyecto

```
WEB/
├── index.html              # Marcado de la portada y de los dos mundos (+ sprite SVG inline)
├── vite.config.js
├── vercel.json             # Redirecciones /cine → /#cine, /corporativo → /#corporativo
├── package.json
├── .env                    # Secretos locales (ignorado por git)
├── .env.example            # Plantilla de variables
├── docs/
│   └── SPECS.md            # Este documento
├── scripts/
│   └── make-grain.mjs      # Genera public/media/img/grain.png (grano de los marcos, §6.1)
├── public/                 # Se sirve tal cual en la raíz del sitio
│   ├── favicon.svg         # El gato; purple o yellow según el tema del sistema
│   └── media/
│       ├── brand/          # katinfilms-gato.svg, katinfilms-wordmark.svg (trazados, currentColor)
│       ├── video/          # Previews .mp4/.webm cortos y comprimidos
│       ├── img/            # Posters, fotos (.avif/.webp); team/ = retratos 480/800 px; grain.png
│       └── models/         # Modelos 3D .glb (Draco/Meshopt)
└── src/
    ├── main.js             # Punto de entrada: orquesta la inicialización
    ├── core/               # Infraestructura transversal, sin conocimiento de secciones
    │   ├── router.js          # Hash → { world, section }; pushState, Atrás/Adelante
    │   ├── smooth-scroll.js   # Lenis + sincronía con GSAP
    │   ├── motion.js          # Tokens de movimiento (curvas, duraciones) para GSAP — §6.1
    │   ├── animations.js      # Primitivas de entrada (texto, palabras, marcos) y apariciones [data-reveal]
    │   ├── line.js            # Línea viajera: subrayado único que se desplaza entre elementos
    │   └── motion-prefs.js    # prefers-reduced-motion
    ├── sections/           # Un módulo por sección del sitio: initX()
    │   ├── split.js           # Pantalla dividida: estados y transiciones entre portada y mundos
    │   ├── hero.js            # Entrada/salida del hero de cada mundo
    │   ├── work.js            # Trabajos por mundo + filtros
    │   └── nav.js             # Línea viajera y sección activa; menú desplegable en móvil
    ├── three/              # Todo lo WebGL. Nunca se importa estáticamente desde fuera.
    │   └── scene.js           # (sin uso desde v0.2; queda para la v0.4)
    ├── data/
    │   └── projects.js     # Contenido de los trabajos (fuente única de verdad)
    └── styles/
        ├── tokens.css      # Paleta, temas por mundo, escala tipográfica, espaciado
        ├── main.css        # Base, barra superior, hero y secciones
        └── split.css       # Mecánica del corte (solo con JS)
```

### Mecánica de la pantalla dividida
- **Rutas (hash):** `''` = portada; `#cine` / `#corporativo` = mundo; `#cine-trabajos`,
  `#corporativo-contacto`, etc. = mundo + sección. El mundo se deduce del prefijo. Sin JS son anclas normales.
- **Estado en `<html>`:** `data-route` (landing | cine | corporativo) y `data-phase` (stage = mundos fijos y
  enmascarados; world = un mundo con scroll normal). Un script inline en el `<head>` los fija antes del
  primer pintado, así un deep link no muestra primero la portada. Además: `data-lean` (cine | corporativo,
  la mitad que se mira en la portada) y `data-intro` (la intro al cargar sigue pendiente, §6).
- **Un único valor, `--split`** (0–100 % del viewport), dice dónde está la línea. CSS define su valor de
  reposo por ruta y por eje (horizontal en desktop; vertical en móvil, con Cine arriba), declarado en las
  seis piezas que dependen de él (las dos máscaras, los dos contenidos y la cinta) y registrado con
  `@property` sin herencia: cambiarlo no recalcula el estilo de nada más.
- **El viaje (`travel` en `split.js`):** JS no anima `--split`. Lee dónde está cada pieza, cambia la ruta (o
  la inclinación) y anima cada pieza desde donde estaba hasta donde CSS dice que debe quedar (un FLIP con
  Web Animations, solo `transform`). Corre en el compositor: no pierde fotogramas aunque el hilo principal
  esté ocupado, parte siempre de la posición actual (también si interrumpe una inclinación) y, al llegar,
  CSS vuelve a mandar. JS no conoce los valores ni el eje.
- **Contra-traslación:** cada mundo es `.world__mask > .world__inner`. La máscara se traslada y el contenido
  se traslada al revés, así el contenido no se mueve mientras se revela. Solo `transform`.
- **Transiciones:** portada → mundo (la línea viaja al margen), mundo → portada y mundo → mundo por el riel.
  Antes de cortar se "rebobina" al inicio. Si llegan rutas durante una transición, solo se atiende la última.
- **Trabajo caro, fuera de los fotogramas que se ven:**
  - En la fase `stage`, las secciones bajo el hero no tienen caja (`display: none`): la portada no calcula
    el layout ni descarga las imágenes de mundos que aún no se ven. Al abrir un mundo, `split.js` les da
    caja (`data-ready`), una por fotograma, con la línea ya en marcha y antes de que entre el hero.
  - El paso a la fase `world` (que reorganiza todo el layout) se hace cuando ya no se mueve nada, y en un
    orden que cuesta un solo layout: limpiar estilos en línea, cambiar de fase, activar apariciones, medir.
- **Hooks:** `initSplit({ onActivate, onDeactivate })` avisa cuando un mundo queda (o deja de estar) a pantalla
  completa con scroll; `main.js` los usa para las apariciones y la sección activa de la barra.
- **Movimiento reducido:** cambios de estado instantáneos. **Sin JS:** los dos mundos en flujo, uno tras otro.

### Reglas de la estructura
- `core/` no importa nada de `sections/` ni de `three/`.
- `three/` solo se carga con `import()` dinámico — así Vite lo separa en su propio chunk.
- Cada sección exporta una función `initX(options)` que se llama desde `main.js`.
  Si crea listeners, timelines o escenas, devuelve un objeto con `dispose()`.
- El contenido (textos de trabajos, enlaces) vive en `src/data/`, no en el código de las secciones.
- Atributos `data-*` como contrato entre HTML y JS (`data-cover`, `data-hero-part`, `data-work-grid`,
  `data-work-filters`, `data-strip-film`, `data-lockup`, `data-reveal`, `data-split`). Las clases CSS son solo
  para estilo. `data-reveal-state`, `data-ready` y `data-lean` los pone y los quita JS (no escribirlos en el HTML).

## 4. Secciones

**Portada (pantalla dividida):** dos mitades enlazadas (`#cine`, `#corporativo`), la cinta divisoria y el logo
KATIN | gato | FILMS montado sobre ella. Hay una intro única al cargar (la cinta se dibuja y aparecen los
textos), y al pasar el cursor o dar foco a una mitad, la línea se inclina hacia la otra.

Cada mundo tiene:

| # | Sección | Cine | Corporativo |
|---|---|---|---|
| 1 | **Hero** | Showreel en scope 2.39:1 + título + texto | Título, servicios, CTA "Cotizar un proyecto" + showreel 16:9 |
| 2 | **Trabajos** | Una película por fila, marco 2.39:1; filtros: cortometrajes animados / largometrajes documentales | Grilla 16:9; filtros: publicidad / video corporativo / comunicación interna / fotografía |
| 3 | **Nosotras** | Las dos integrantes, retratos en tritono | Las dos integrantes, retratos a color |
| 4 | **Contacto** | Festivales, coproducciones, prensa | Cotizaciones |

Pendiente: detalle de proyecto ([ABIERTO] modal vs. página propia), video real en los showreels.

## 5. Modelo de datos — `Project`

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | string | sí | slug único |
| `world` | `'cine' \| 'corporativo'` | sí | en qué mundo aparece |
| `category` | `'cortometraje-animado' \| 'largometraje-documental' \| 'publicidad' \| 'corporativo' \| 'comunicacion-interna' \| 'fotografia'` | sí | las etiquetas visibles están en `categories` |
| `title` | string | sí | |
| `year` | number | sí | |
| `role` | string | sí | p. ej. "Dirección y montaje" |
| `client` | string | no | corporativo |
| `duration` | string | no | cine, p. ej. "12 min" |
| `summary` | string | no | sinopsis breve |
| `poster` | string (ruta) | no* | still 2.39:1 (cine) o 16:9 (corporativo), ≤ 200 KB. *Sin poster se muestra "Imagen pendiente" |
| `preview` | string (ruta) | no | loop mudo de 5–10 s, ≤ 2 MB; sin él no se crea `<video>` |
| `embed` | string (URL) | no | video completo alojado en Vimeo/YouTube |

## 6. Requisitos no funcionales

### Rendimiento (presupuesto)
- JS inicial (sin Three.js): **≤ 80 KB gzip** (hoy 40,8 KB; Flip, 9,2 KB, va aparte). Three.js solo cuando se use.
- LCP ≤ 2,5 s en 4G; CLS ≤ 0,1; Lighthouse Performance ≥ 90 en móvil. Medido en la portada con 4G lento
  (1,6 Mbps, 150 ms) y CPU ×4: LCP 2,2 s, CLS 0. El LCP es el texto de las portadas, que entra con la
  intro: todo lo que retrase el arranque de la intro retrasa el LCP.
- La fuente del texto se precarga (`vite.config.js` inyecta el `<link rel="preload">` en el build).
- Los videos **nunca** van en el repo como masters: solo previews comprimidos. Los
  videos completos se alojan en Vimeo/YouTube.
- Videos con `preload="none"` + `poster`; reproducción solo al hover o al entrar en pantalla.
- Animar solo `transform` y `opacity`. Excepciones acotadas: el subrayado de los enlaces de texto
  (`background-size`, un área de 2 px), el despliegue del menú móvil (`clip-path`) y el avance de la cinta
  (`mask-position` vía `--film`). Reglas de rendimiento del movimiento en §6.1.
- Escenas 3D: `pixelRatio` máximo 2, render pausado fuera de pantalla, `dispose()` al desmontar.
- Modelos `.glb` comprimidos (Draco o Meshopt), ≤ 3 MB.

### Accesibilidad
- Respetar `prefers-reduced-motion`: sin Lenis, sin animaciones de entrada, sin 3D.
- Todo el contenido es visible y legible **sin JavaScript** (las animaciones parten de
  `gsap.from`, nunca de un estado oculto en CSS). Excepciones: la lista de trabajos se genera
  desde `projects.js` (sin JS se ve un aviso `<noscript>`), y la intro al cargar (portada, o mundo
  abierto por enlace directo), que solo existe con JS (`data-intro`, fijado en el `<head>`). Mientras
  está pendiente, lo que lleva texto no tiene caja; el módulo arranca la intro cuando la fuente ya cargó
  (tope: 400 ms) y, si no llegara a hacerlo, el mismo script del `<head>` retira `data-intro` a los 2,5 s
  y se muestra todo, sin intro.
- Con movimiento reducido no hay intro, ni apariciones, ni palabras partidas: los cambios de estado son
  instantáneos y la línea viajera salta sin transición. Ojo al probar en Windows: si "Efectos de animación"
  está desactivado (Configuración → Accesibilidad → Efectos visuales), el navegador informa movimiento
  reducido y el sitio no anima nada.
- Los títulos partidos en palabras conservan una copia `.sr-only` del texto; las palabras van `aria-hidden`.
- Al entrar a un mundo, el foco pasa a su título (`h1`); al volver a la portada, a la mitad de la que se salió.
- Navegación completa por teclado y foco visible.
- Videos decorativos `muted`; canvas 3D con `aria-hidden="true"`.
- Contraste mínimo AA.

### 6.1 Sistema de movimiento

**Motivo:** una línea que viaja. La cinta naranja viaja entre mundos; el mismo gesto, en pequeño, marca la
sección activa de la barra y el filtro elegido (`core/line.js`), y los marcos se abren con un barrido en la
misma dirección en que viajó la línea al abrir ese mundo (Cine hacia la derecha, Corporativo hacia la
izquierda; en móvil vertical, hacia abajo y hacia arriba).

**Curva de la casa:** exponencial. `expo.out` para entradas, hovers y respuestas; `expo.inOut` para los
viajes de un estado a otro (la línea, la compuerta de los marcos). Recorre casi todo el camino al principio y
se asienta con una cola larga: responde al instante y nunca frena en seco. Fuente única en
`core/motion.js` (GSAP) y su espejo en `tokens.css` (`--ease-out`, `--ease-in-out`, `--dur-*`), donde se usa
`linear()` con la curva exacta de GSAP (error < 0,25 %) y una Bézier de respaldo.

| Momento | Qué pasa |
|---|---|
| Carga de la portada | La cinta se dibuja mientras avanza; la placa del gato aparece y KATIN / FILMS salen de detrás de ella; los títulos suben palabra por palabra |
| Carga de un mundo (enlace directo) | Baja la barra, se dibuja el riel, entra el hero |
| Portada → mundo | La portada se desvanece al instante (en el compositor), la línea viaja al margen, el showreel se abre como un corte, el título sube por palabras, baja la barra |
| Mundo → mundo | Rebobina, la línea barre la pantalla y entra el hero del otro mundo |
| Mundo → portada | Sale el hero, la línea vuelve al centro, reaparecen logo y portadas |
| Scroll | `data-reveal`: `text` (sube 24 px y aparece), `title` (palabras desde una máscara), `frame` (compuerta + la imagen se asienta de 1.12 a 1). Lo que entra junto se escalona en orden de lectura, máx. ~0,5 s |
| Hovers y clics | Línea viajera en barra y filtros; subrayado de enlaces que se cubre de izquierda a derecha y se retira a la derecha; botón con etiqueta que rueda y se hunde al pulsar; riel con su rótulo; inclinación de la línea en la portada |

**Reglas de rendimiento** (medidas en una GPU integrada Intel HD 520, a 1440×900):
- Lo que se va a animar recibe capa propia (`will-change`) antes de moverse y vuelve a la capa común solo con
  todo quieto (`core/animations.js`, registro de capas). Crear capas a mitad de una animación da tirones.
  Excepción: el hero y la portada no se promueven, porque una capa nueva dentro del mundo que se desplaza
  costaba más de lo que ahorraba.
- **Nunca animar una propiedad personalizada heredada en un ancestro.** Animar `--split` en `<html>`
  recalculaba el estilo del documento entero en cada fotograma (342 elementos: 6 ms en frío, 30–60 ms con
  el equipo caliente) y era el 70–80 % del trabajo del hilo principal en cada transición. Ahora la línea
  viaja en el compositor (`travel`, §3): mundo → mundo pasó de 21 fotogramas lentos a 2, y el recálculo de
  estilo de 1 178 ms a 264 ms por transición.
- El cambio de fase `stage → world` se hace al final de la transición, con todo quieto.
- **Agrupar escrituras y lecturas.** GSAP lee el estilo calculado de cada elemento al fijarle un transform
  y, si el elemento no tiene caja (`display: none`), lo saca del DOM para medirlo. Por eso las apariciones
  se preparan en tres pasadas (DOM, capas, estilos) y los estilos en línea se limpian antes de dejar sin
  caja al otro mundo: el fotograma del cambio de fase bajó de ~130 ms a ~35 ms.
- **El texto se calcula una vez y con su fuente.** Dar forma al texto con la fuente de respaldo y otra vez
  al llegar Montserrat duplicaba el trabajo de la carga; por eso `data-intro` deja sin caja lo que lleva
  texto hasta que la fuente (precargada) está lista. En la portada (4G lento, CPU ×4): LCP 3,6 s → 2,2 s,
  bloqueo total del hilo principal 1 746 ms → 725 ms, y 165 KB → 107 KB transferidos.
- La portada y el logo tienen capa propia permanente y se desvanecen con Web Animations (compositor).
- El grano de los marcos es un PNG (`scripts/make-grain.mjs`), no un filtro `feTurbulence`: el filtro se
  calculaba al pintar y trababa la primera aparición de cada marco.
- Apariciones con `IntersectionObserver`, no ScrollTrigger (2,7 KB gzip de JS para todo el sistema).
- Pendiente conocido: la primera vez que se abre un mundo en un perfil de navegador nuevo, la GPU compila
  los shaders del degradado y del grano de los marcos (~170 ms sin fotogramas en la HD 520). No pasa en
  las siguientes, y no depende del hilo principal.

### Compatibilidad
Últimas 2 versiones de Chrome, Safari (incl. iOS), Firefox y Edge. En dispositivos táctiles
el preview de video se activa al entrar en pantalla (no hay hover).

### SEO
`<title>`, meta description, Open Graph (imagen 1200×630), HTML semántico, `lang="es"`.

## 7. Convenciones
- Módulos ES, nombres de archivo en `kebab-case.js`.
- CSS con tokens en `tokens.css`; clases BEM simples (`bloque__elemento`).
- Imágenes `.avif`/`.webp`; videos `.mp4` (H.264) + `.webm` opcional.
- Commits cortos en imperativo.

## 8. Seguridad y secretos
- `.env` está en `.gitignore`; `.env.example` documenta las variables sin valores.
- `OPENROUTER_API_KEY` **nunca** lleva prefijo `VITE_`: Vite solo expone al navegador las
  variables `VITE_*`, y cualquier clave en el bundle del cliente es pública.
- Cualquier uso de la IA pasa por `POST /api/ai` (`{ "input": "..." }` → `{ "text": "..." }`):
  - `server/ai.js` — lógica única: valida la entrada (máx. 2000 caracteres), fija modelo
    (`OPENROUTER_MODEL`, por defecto `anthropic/claude-haiku-5.5`), instrucciones y tope de
    500 tokens de salida. El cliente no elige modelo ni límites.
  - `api/ai.js` — función serverless de Vercel que la envuelve.
  - `vite.config.js` — middleware que sirve la misma ruta en `npm run dev`.
  - Nunca importar `server/` desde `src/`. [ABIERTO] qué función de IA concreta se quiere.

## 9. Despliegue
Sitio estático (`npm run build` → `dist/`) en Vercel; `api/ai.js` se despliega como función.
Configurar `OPENROUTER_API_KEY` en Vercel → Settings → Environment Variables. [ABIERTO] dominio.

## 10. Hoja de ruta
1. **v0.1** — Estructura, specs, scroll suave, reveals, escena 3D de prueba. ✅
2. **v0.2** — Pantalla dividida Cine / Corporativo, identidad visual (paleta, logo, tipografía), heroes,
   barras de navegación, filtros, con placeholders. ✅
   - **v0.2.1** — Sistema de movimiento (§6.1): curva exponencial única, intros, apariciones, línea
     viajera, hovers y clics. ✅
   - **v0.2.2** — Rendimiento: viaje de la línea en el compositor, secciones sin caja hasta abrir su
     mundo, texto calculado una sola vez, fuente precargada, Flip en carga diferida (§3, §6.1). ✅
3. **v0.3** — Contenido real (trabajos, bios, showreels, contacto), detalle de proyecto, imagen Open Graph.
4. **v0.4** — Escena 3D (si se decide), cursor personalizado.
5. **v1.0** — Optimización de medios, SEO, accesibilidad auditada, despliegue.

## 11. Decisiones abiertas
- [x] Estructura: dos mundos (Cine / Corporativo) con portada dividida. (v0.2)
- [x] Hero: showreel en video por mundo; la escena 3D queda fuera del hero. (v0.2)
- [x] Filtros por categoría dentro de cada mundo. (v0.2)
- [ ] ¿Licencia web de Panton, o se queda Montserrat?
- [ ] Nombre y rol de la segunda integrante; apellido de Catalina; correo y redes reales.
- [ ] Detalle de proyecto: ¿modal o página propia con transición?
- [ ] ¿Formulario de contacto (requiere backend/servicio) o solo `mailto:`?
- [ ] ¿Sitio bilingüe (es/en)?
- [ ] ¿Para qué se usará OpenRouter/IA en el sitio?
- [ ] Alojamiento de videos completos: ¿Vimeo o YouTube?
