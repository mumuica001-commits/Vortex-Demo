import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: Login });

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.74-.06-1.45-.18-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.3 2.99-7.42Z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.96-.9 6.62-2.35l-3.23-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22Z"
        opacity=".85"
      />
      <path
        fill="currentColor"
        d="M6.4 13.99A6 6 0 0 1 6.08 12c0-.69.12-1.36.32-1.99V7.43H3.06A10 10 0 0 0 2 12c0 1.62.39 3.14 1.06 4.57l3.34-2.58Z"
        opacity=".7"
      />
      <path
        fill="currentColor"
        d="M12 5.96c1.47 0 2.78.5 3.82 1.5l2.86-2.86C16.95 2.97 14.7 2 12 2A10 10 0 0 0 3.06 7.43l3.34 2.58C7.19 7.72 9.4 5.96 12 5.96Z"
        opacity=".55"
      />
    </svg>
  );
}

function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onGoogleSignIn() {
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar com Google");
    }
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        const { error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Vortex",
        });
        if (signUpError) throw new Error(signUpError.message ?? "Não foi possível criar a conta");
      }
      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) throw new Error(signInError.message ?? "Email ou senha incorretos");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="glow-field relative min-h-dvh overflow-hidden px-5 py-10">
      <div className="relative mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="stagger-in mb-8 flex flex-col items-center text-center">
          <BrandMark className="mb-6" />
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
            Entre para chamar
          </h1>
          <p className="mt-2 text-sm text-muted">
            Google ou email. Amigos, convites e o celular como webcam ficam na sua conta.
          </p>
        </div>

        <div className="rounded-3xl bg-bg-elevated p-5 shadow-[var(--shadow-border)] sm:p-6">
          {!authEnabled ? (
            <p className="text-sm text-muted">Entrada desativada neste ambiente.</p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => void onGoogleSignIn()}
                  className="w-full"
                >
                  <GoogleMark />
                  Continuar com Google
                </Button>
              </div>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] tracking-wide text-subtle uppercase">ou email</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-bg p-1 shadow-[var(--shadow-border)]">
                {(["login", "register"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setError(null);
                    }}
                    className={cn(
                      "h-9 rounded-[10px] text-sm font-medium transition-colors duration-150",
                      mode === m ? "bg-bg-subtle text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {m === "login" ? "Entrar" : "Criar conta"}
                  </button>
                ))}
              </div>

              <form onSubmit={(e) => void onEmail(e)} className="flex flex-col gap-2.5">
                {mode === "register" && (
                  <Input
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                )}
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <Input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                />
                {error && <p className="text-sm text-danger">{error}</p>}
                <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
                  {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Só quer entrar numa sala?{" "}
          <Link to="/" className="text-fg underline-offset-4 hover:underline">
            Continuar sem conta
          </Link>
        </p>
      </div>
    </main>
  );
}
