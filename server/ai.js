/**
 * Lógica de IA del lado servidor. NUNCA se importa desde src/ (iría al bundle del navegador).
 * La usan: api/ai.js (Vercel en producción) y el middleware de vite.config.js (desarrollo).
 *
 * Contrato:  POST /api/ai   { "input": "texto" }
 *   200 → { "text": "respuesta" }
 *   4xx/5xx → { "error": "mensaje" }
 *
 * El modelo, el límite de tokens y las instrucciones se fijan aquí, no en el cliente:
 * así nadie puede usar tu clave para pedir un modelo caro o respuestas enormes.
 */
import { OpenRouter } from '@openrouter/sdk';

const DEFAULT_MODEL = 'anthropic/claude-haiku-5.5';
const MAX_INPUT_CHARS = 2000;
const MAX_OUTPUT_TOKENS = 500;
const INSTRUCTIONS =
  'Eres el asistente del sitio web de Katinfilms, productora audiovisual. ' +
  'Responde en español, de forma breve y cordial.';

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env  variables de entorno del servidor
 * @returns {Promise<Response>}
 */
export async function handleAi(request, env) {
  if (request.method !== 'POST') return json(405, { error: 'Método no permitido' });

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return json(500, { error: 'Falta OPENROUTER_API_KEY en el servidor' });

  let input;
  try {
    ({ input } = await request.json());
  } catch {
    return json(400, { error: 'El cuerpo debe ser JSON: { "input": "..." }' });
  }
  if (typeof input !== 'string' || !input.trim()) {
    return json(400, { error: '"input" debe ser un texto no vacío' });
  }
  if (input.length > MAX_INPUT_CHARS) {
    return json(413, { error: `"input" supera ${MAX_INPUT_CHARS} caracteres` });
  }

  const client = new OpenRouter({ apiKey, appTitle: 'Katinfilms', timeoutMs: 30_000 });

  try {
    const response = await client.responses.send({
      responsesRequest: {
        model: env.OPENROUTER_MODEL || DEFAULT_MODEL,
        instructions: INSTRUCTIONS,
        input: input.trim(),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    });

    if (response.status !== 'completed') {
      console.error('[api/ai] respuesta incompleta:', response.status, response.error);
      return json(502, { error: 'La IA no completó la respuesta' });
    }

    const message = response.output.find((item) => item.type === 'message');
    const text = message?.content.find((part) => part.type === 'output_text')?.text ?? '';
    return json(200, { text });
  } catch (err) {
    // El detalle va al log del servidor; al navegador solo un mensaje genérico.
    console.error('[api/ai] error de OpenRouter:', err);
    return json(502, { error: 'Error al consultar la IA' });
  }
}
