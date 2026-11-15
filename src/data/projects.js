/**
 * Catálogo de proyectos y producciones de Katinfilms.
 *
 * `world`:    'cine' | 'corporativo'
 * `category`: clave de `categories`. Los filtros se generan solos a partir de las categorías
 *             presentes en cada mundo.
 * `poster`:   ruta en `public/media/img/work/...`
 * `logo`:     logo opcional del cliente (`public/media/img/clients/...`)
 */

export const categories = {
  // Cine
  animacion: { singular: 'Animación', plural: 'Animación' },
  cortometraje: { singular: 'Cortometraje', plural: 'Cortometrajes' },
  largometraje: { singular: 'Largometraje', plural: 'Largometrajes' },
  // Corporativo
  institucional: { singular: 'Audiovisual corporativo', plural: 'Corporativo' },
  campana: { singular: 'Campaña digital', plural: 'Campañas' },
  cobertura: { singular: 'Cobertura y registro', plural: 'Coberturas' },
};

/** @type {Array<Record<string, any>>} */
export const projects = [
  /* ============================== CINE ============================== */
  {
    id: 'el-secreto-del-aviador',
    world: 'cine',
    title: 'El Secreto del Aviador',
    year: '2025',
    category: 'largometraje',
    duration: 'Largometraje · 100 min. aprox.',
    genre: 'Drama · Thriller político',
    status: 'Desarrollo avanzado',
    role: 'Guion cinematográfico · Selección Oficial & Fondo Audiovisual',
    summary:
      'Chile, 1974. En los meses más oscuros de la dictadura, una tenaz periodista recién censurada y la esposa de un coronel del ejército olvidan sus diferencias políticas para salvar a un joven aviador de la pena de muerte. En el camino, descubren un secreto militar que el nuevo régimen quiere enterrar a toda costa: un plan para asesinar al expresidente Salvador Allende antes del golpe.',
    poster: '/media/img/work/secreto-del-aviador.png',
  },
  {
    id: 'recuerdos-en-la-niebla',
    world: 'cine',
    title: 'Recuerdos en la Niebla',
    year: '2025',
    category: 'largometraje',
    duration: 'Largometraje · 110 min. aprox.',
    genre: 'Fantasía Oscura',
    status: 'En desarrollo',
    role: 'Dirección y desarrollo original',
    summary:
      'Sara es una joven bruja que ignora la magnitud de sus poderes: su madre Helga la ha convencido de que es poca cosa, mientras la manipula para alimentar sus propios hechizos y la aísla de todo vínculo afectivo. Un día, su mundo se sacude: recibe una carta en secreto de su abuelo paterno Héctor, a quien apenas recuerda, pidiendo verla, pero Sara no está segura de desobedecer a su madre. Esa noche, un ente comienza a visitarla en pesadillas que se transforman en un sendero de pistas, guiándola hacia recuerdos felices de su familia paterna. Sara arma el puzle onírico y comprende que su madre la ha embrujado para alejarla de su familia. Ahora deberá enfrentarse a Helga, destruyendo sus hechizos para recuperar su autoestima, a su familia y creer en su poder.',
    poster: '/media/img/work/recuerdos-en-la-niebla.png',
  },
  {
    id: 'michiboo',
    world: 'cine',
    title: 'Michiboo',
    year: '2025',
    category: 'animacion',
    duration: 'Cortometraje animado · 8 min. aprox.',
    genre: 'Fantasía Oscura',
    status: 'En desarrollo',
    role: 'Productora: Constanza Fuentes',
    summary:
      'Michiboo, el espíritu felino guardián de Iris, tiene una última misión antes de que ambas crucen el arcoíris: derrotar a los Turururos, criaturas que se alimentan del dolor de Bea, su nieta, para que puedan darse el abrazo de despedida que quedó pendiente.',
    poster: '/media/img/work/michiboo-portada.png',
    secondaryPoster: '/media/img/work/michiboo-styleframe.jpg',
  },
  {
    id: 'la-herencia-de-la-oscuridad',
    world: 'cine',
    title: 'La Herencia de la Oscuridad',
    year: '2025',
    category: 'animacion',
    duration: 'Serie animada · 10 cap. x 25 min.',
    genre: 'Terror · Aventura',
    status: 'Desarrollo avanzado',
    role: 'Desarrollo visual y serie animada',
    summary:
      'En la Sudamérica del siglo XVII, Cuervo, un gaucho cazador de monstruos debe matar a 3 poderosas criaturas para rescatar a su hijo de Mandinga. Junto a una bruja y un niño maldito, se ve arrastrados a un conflicto sangriento, que desafía sus principios y su integridad. Un sacrificio para cambiar la magia en Sudamérica para siempre.',
    poster: '/media/img/work/heritage-of-darkness.png',
    secondaryPoster: '/media/img/work/myl-styleframe.png',
  },

  /* =========================== CORPORATIVO =========================== */
  {
    id: 'legrand-institucional',
    world: 'corporativo',
    title: 'Soluciones de Infraestructura Eléctrica y Digital',
    client: 'Legrand Chile',
    year: '2025',
    category: 'institucional',
    summary:
      'Producción integral de cápsulas audiovisuales corporativas, dirección de fotografía en locación y postproducción para comunicación B2B y lanzamientos de línea.',
    poster: '/media/img/work/michiboo-styleframe.jpg',
    logo: '/media/img/clients/legrand.png',
    badge: 'Producción B2B · Dirección & Post',
  },
  {
    id: 'bticino-campana',
    world: 'corporativo',
    title: 'Diseño y Domótica para Espacios Contemporáneos',
    client: 'BTicino',
    year: '2025',
    category: 'campana',
    summary:
      'Piezas audiovisuales para ecosistema digital, showrooms y redes sociales destacando diseño industrial, hogares conectados y experiencia de usuario.',
    poster: '/media/img/work/myl-styleframe.png',
    logo: '/media/img/clients/bticino.webp',
    badge: 'Campaña Digital · Motion & Color',
  },
  {
    id: 'activa-audiovisual',
    world: 'corporativo',
    title: 'Comunicación Estratégica e Insights de Mercado',
    client: 'Activa Research',
    year: '2024',
    category: 'institucional',
    summary:
      'Desarrollo de piezas de video institucional y visualización animada de estudios de mercado para presentaciones ejecutivas y difusión multimedial.',
    poster: '/media/img/work/heritage-of-darkness.png',
    logo: '/media/img/clients/activa.png',
    badge: 'Cápsulas Ejecutivas · Motion Graphics',
  },
  {
    id: 'solis-storage-cobertura',
    world: 'corporativo',
    title: 'Energía Renovable y Almacenamiento BESS',
    client: 'Solis Storage',
    year: '2025',
    category: 'cobertura',
    summary:
      'Registro audiovisual técnico, cobertura de proyectos de energía solar y sistemas de almacenamiento para posicionamiento de marca en Latinoamérica.',
    poster: '/media/img/work/recuerdos-en-la-niebla.png',
    logo: '/media/img/clients/solis-storage.png',
    badge: 'Registro Industrial · Cobertura',
  },
];
