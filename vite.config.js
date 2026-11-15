import { defineConfig, loadEnv } from 'vite';
import { handleAi } from './server/ai.js';

/**
 * En desarrollo, sirve /api/ai con la misma lógica que la función de Vercel (api/ai.js).
 * loadEnv(mode, cwd, '') lee .env SOLO en este proceso de Node: no se expone al navegador,
 * porque Vite solo inyecta en el bundle las variables con prefijo VITE_.
 */
function devApi() {
  let env = {};
  return {
    name: 'katinfilms-dev-api',
    apply: 'serve',
    configResolved(config) {
      env = loadEnv(config.mode, config.root, '');
    },
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
          const request = new Request(new URL(req.originalUrl ?? req.url, 'http://localhost'), {
            method: req.method,
            headers: req.headers,
            body: hasBody ? Buffer.concat(chunks) : undefined,
          });
          const response = await handleAi(request, env);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (err) {
          console.error('[dev api]', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Error interno' }));
        }
      });
    },
  };
}

/**
 * Precarga la fuente del texto (subconjunto latino de Montserrat). Sin esto el navegador la descubre
 * recién al aplicar el CSS; así empieza a bajar junto con él, y la intro (que espera a la fuente para
 * no cambiar de métrica a mitad de una entrada) arranca antes. Solo en el build: el nombre lleva hash.
 */
function preloadFont() {
  return {
    name: 'katinfilms-preload-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const fonts = Object.keys(ctx.bundle ?? {}).filter((file) =>
          /(rubik|montserrat)-latin-wght-normal-[\w-]+\.woff2$/.test(file)
        );
        return fonts.map((font) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${font}`, crossorigin: true },
          injectTo: 'head-prepend',
        }));
      },
    },
  };
}

export default defineConfig({
  plugins: [devApi(), preloadFont()],
  optimizeDeps: {
    include: ['gsap', 'gsap/Flip', 'lenis'],
  },
  server: { port: 5173, open: false },
  build: {
    target: 'es2020',
    // El chunk de Three.js (~530 KB sin comprimir) es diferido; no afecta la carga inicial.
    chunkSizeWarningLimit: 600,
  },
});
