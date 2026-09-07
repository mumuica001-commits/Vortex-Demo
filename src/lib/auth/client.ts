import { createAuthClient } from "better-auth/react";

/**
 * Cliente Better Auth oficial para o browser.
 * Comunica diretamente com as rotas /api/auth/* da sua aplicação.
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

export const GROK_PROVIDERS = [];

export function getBearerToken(): string | null {
  return null;
}

/**
 * Função de logout limpa usando a sessão padrão por cookies HTTP-only.
 */
export async function signOut(redirectTo = "/"): Promise<void> {
  await authClient.signOut();
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}

/**
 * Dispara o login social direto (ex: "google").
 */
export async function signIn(
  providerId: string,
  opts: { callbackURL?: string } = {},
): Promise<void> {
  const callbackURL = opts.callbackURL ?? "/";
  await authClient.signIn.social({
    provider: providerId as "google",
    callbackURL,
  });
}
