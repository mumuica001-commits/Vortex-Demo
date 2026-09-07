import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/vortex/types";

function formatTime(ts: string | number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PrivateChat(props: {
  friend: string;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = text.trim();
    if (!next) return;
    props.onSend(next);
    setText("");
  }

  return (
    <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-[28px] bg-bg-elevated shadow-[var(--shadow-border)]">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-display text-sm font-semibold">@{props.friend}</p>
          <p className="text-xs text-muted">Mensagem direta</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={props.onClose} aria-label="Fechar">
          <X className="size-4" />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {props.messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">Nenhuma mensagem ainda. Diga oi.</p>
        )}
        {props.messages.map((m) => (
          <div
            key={m.id}
            className={cn("max-w-[80%] rounded-2xl px-3 py-2", m.fromMe ? "ml-auto bg-accent text-accent-fg" : "bg-bg-subtle")}
          >
            <p className="text-sm leading-snug">{m.text}</p>
            <p className={cn("mt-1 text-[10px] tabular-nums", m.fromMe ? "text-accent-fg/60" : "text-subtle")}>
              {formatTime(m.time)}
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
        <Input
          placeholder="Escrever…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-10"
        />
        <Button type="submit" size="icon-sm" aria-label="Enviar">
          <Send className="size-3.5" />
        </Button>
      </form>
    </section>
  );
}
