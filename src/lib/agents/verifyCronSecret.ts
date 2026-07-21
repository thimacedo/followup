import crypto from "crypto";

/**
 * Compara o header x-agent-secret com AGENT_CRON_SECRET em tempo constante,
 * evitando ataques de timing. Retorna false também se o secret não estiver
 * configurado (nunca autentica "vazio == vazio").
 */
export function verifyCronSecret(req: Request): boolean {
  const provided = req.headers.get("x-agent-secret") || "";
  const expected = process.env.AGENT_CRON_SECRET || "";

  if (!expected || !provided) return false;

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  // timingSafeEqual exige buffers do mesmo tamanho
  if (providedBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}
