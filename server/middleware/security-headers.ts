/**
 * Cabeçalhos de segurança aplicados a toda resposta HTTP (produção e dev).
 * Auto-registrado pelo Nitro porque vite.config.ts define `serverDir: "./server"`.
 *
 * Ajustado para o que este app realmente usa:
 * - WebRTC com STUN público (Google + Cloudflare) — liberado em connect-src.
 * - Câmera/microfone/compartilhamento de tela — liberados via Permissions-Policy,
 *   mas só para o próprio site (self), nunca para iframes de terceiros.
 * - Sem scripts inline (verificado em __root.tsx) — script-src fica estrito.
 */
export default async function securityHeadersMiddleware(
  event: { req: { headers: Headers } },
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (!(result instanceof Response)) return result;

  const isHttps =
    event.req.headers.get("x-forwarded-proto") === "https" ||
    event.req.headers.get("x-forwarded-ssl") === "on";

  const headers = new Headers(result.headers);

  // HTTPS forçado por 1 ano (inclui subdomínios). Sem efeito em http:// local.
  if (isHttps) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");

  // Câmera/microfone/tela: só para este site, nunca para um iframe de terceiro.
  headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()",
  );

  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' stun:stun.l.google.com:19302 stun:stun.cloudflare.com:3478",
    "media-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  headers.set("Content-Security-Policy", csp);

  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}
