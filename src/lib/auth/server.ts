import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { pgliteDialect } from "./pglite-dialect";

void ensureDbReady();

const globalAuthRef = globalThis as typeof globalThis & {
  __authSecret__?: string;
};
function getAuthSecret(): string {
  globalAuthRef.__authSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__authSecret__;
}

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const explicitBaseURL = env("BETTER_AUTH_URL");
const databaseUrl = env("DATABASE_URL");

const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
];

const trustedOrigins: string[] = explicitBaseURL
  ? [explicitBaseURL, ...LOCAL_DEV_ORIGINS]
  : [...LOCAL_DEV_ORIGINS];

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

export const SESSION_TOKEN_COOKIE = "app_auth.session_token";

export const auth = betterAuth({
  baseURL: explicitBaseURL ?? "http://localhost:3000",
  secret: env("BETTER_AUTH_SECRET") ?? getAuthSecret(),
  database,
  trustedOrigins,

  emailAndPassword: {
    enabled: emailAndPasswordEnabled,
  },

  // ADICIONE ISTO AQUI:
  socialProviders: {
    google: {
      clientId: env("GOOGLE_CLIENT_ID")!,
      clientSecret: env("GOOGLE_CLIENT_SECRET")!,
    },
  },

  session: {
    cookieCache: { enabled: true, maxAge: 300 },
  },

  plugins: [
    bearer(),
    tanstackStartCookies(),
    // REMOVA: grokOAuthPlugin e gateIdentitySessions()
  ],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

export const authConfigured = true;

export const GROK_PROVIDERS = [];
