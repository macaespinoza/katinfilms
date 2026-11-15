// Función serverless de Vercel: POST /api/ai. La lógica vive en server/ai.js.
// La clave se configura en Vercel → Project → Settings → Environment Variables.
import { handleAi } from '../server/ai.js';

export function POST(request) {
  return handleAi(request, process.env);
}
