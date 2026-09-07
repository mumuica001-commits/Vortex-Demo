import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt({ compact = false }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone));
    if (standalone) {
      setInstalled(true);
      return;
    }
    const ua = navigator.userAgent;
    setIos(/iPad|iPhone|iPod/.test(ua));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed || hidden) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    window.location.href = "/?install=1";
  }

  if (compact) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => void install()}>
        <Download className="size-3.5" />
        Instalar app
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]",
      )}
    >
      <button
        type="button"
        aria-label="Dispensar"
        onClick={() => setHidden(true)}
        className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-muted hover:bg-bg-subtle hover:text-fg"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-bg-subtle shadow-[var(--shadow-border)]">
          <Smartphone className="size-5 text-fg" />
        </span>
        <div className="pr-6">
          <p className="font-display text-sm font-semibold">Usar como app no celular</p>
          <p className="mt-1 text-sm text-muted">
            {ios
              ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. O Vortex abre em tela cheia, como um app."
              : "Instale o Vortex na tela inicial. No Android vira um app (WebAPK) — ícone, tela cheia e câmera nativa."}
          </p>
          <div className="mt-3">
            <Button type="button" size="sm" onClick={() => void install()}>
              <Download className="size-3.5" />
              {deferred ? "Instalar agora" : "Como instalar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
