import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

export const GROK_PROVIDERS = [];

export function getBearerToken(): string | null {
  return null;
}

export async function signOut(redirectTo = "/"): Promise<void> {
  await authClient.signOut();
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}

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
