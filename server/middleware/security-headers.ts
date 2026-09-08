/**
 * Cabeçalhos de segurança aplicados a toda resposta HTTP.
 * Ajustado para permitir hidratação do TanStack Start e extensões necessárias.
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

  if (isHttps) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");

  headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()",
  );

  const csp = [
    "default-src 'self'",
    // Adicionado 'unsafe-inline', 'unsafe-eval' e suporte a extensões/grok para não quebrar a hidratação do React
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://grok.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // Removido o esquema inválido 'stun:', liberando conexões HTTPS e WSS
    "connect-src 'self' https: wss:",
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
