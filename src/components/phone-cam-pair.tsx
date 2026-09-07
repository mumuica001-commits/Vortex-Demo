import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toQrSvg } from "@/lib/call/qr";
import { cn } from "@/lib/utils";

export function PhoneCamPair(props: {
  code: string;
  connected: boolean;
  onClose: () => void;
}) {
  const [svg, setSvg] = useState<string>("");
  const url =
    typeof window === "undefined"
      ? `/cam/${props.code}`
      : `${window.location.origin}/cam/${props.code}`;

  useEffect(() => {
    void toQrSvg(url).then(setSvg);
  }, [url]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-4">
      <div className="relative w-full max-w-sm rounded-[28px] bg-bg-elevated p-6 shadow-[var(--shadow-border)]">
        <button
          type="button"
          aria-label="Fechar"
          onClick={props.onClose}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted hover:bg-bg-subtle hover:text-fg"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-bg-subtle">
            <Smartphone className="size-4" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold">Celular como webcam</p>
            <p className="text-xs text-muted">Abra o Vortex no celular e aponte a câmera.</p>
          </div>
        </div>
        <div
          className={cn(
            "mt-5 overflow-hidden rounded-3xl bg-fg p-3",
            props.connected && "ring-2 ring-live",
          )}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="mt-4 text-center font-display text-2xl font-semibold tracking-[0.28em] tabular-nums">
          {props.code}
        </p>
        <p className="mt-2 text-center text-xs text-muted break-all">{url}</p>
        <p className="mt-4 text-center text-sm text-muted">
          {props.connected
            ? "Celular conectado. A imagem dele entra na chamada no lugar da webcam."
            : "No celular, abra o link ou entre em vortex e use o código."}
        </p>
        <Button type="button" variant="secondary" className="mt-5 w-full" onClick={props.onClose}>
          {props.connected ? "Pronto" : "Fechar"}
        </Button>
      </div>
    </div>
  );
}
