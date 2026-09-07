import { useMemo, useState } from "react";
import { Check, Phone, Plus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FriendRow, IncomingRequest } from "@/lib/vortex/types";

export function FriendsPanel(props: {
  username: string;
  friends: FriendRow[];
  incoming: IncomingRequest[];
  outgoing: string[];
  selected: string | null;
  lastRead: Record<string, string>;
  onSelect: (username: string) => void;
  onAdd: (username: string) => Promise<void>;
  onRespond: (username: string, accept: boolean) => Promise<void>;
  onCall: (username: string) => void;
}) {
  const [add, setAdd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unread = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const f of props.friends) {
      if (!f.lastMessageAt) continue;
      const read = props.lastRead[f.username];
      map[f.username] = !read || new Date(f.lastMessageAt) > new Date(read);
    }
    return map;
  }, [props.friends, props.lastRead]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const username = add.trim().replace(/^@/, "");
    if (!username) return;
    setBusy(true);
    setErr(null);
    try {
      await props.onAdd(username);
      setAdd("");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Não foi possível adicionar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pt-4 pb-3">
        <p className="text-[11px] tracking-[0.18em] text-subtle uppercase">Você</p>
        <p className="mt-0.5 font-display text-sm font-semibold">@{props.username}</p>
      </div>

      <form onSubmit={(e) => void submit(e)} className="flex gap-2 px-4">
        <Input
          placeholder="Adicionar @usuario"
          value={add}
          onChange={(e) => setAdd(e.target.value)}
          className="h-10"
        />
        <Button type="submit" size="icon-sm" disabled={busy} aria-label="Adicionar amigo">
          <Plus className="size-4" />
        </Button>
      </form>
      {err && <p className="px-4 pt-2 text-xs text-danger">{err}</p>}

      {props.incoming.length > 0 && (
        <div className="mt-4 px-4">
          <p className="mb-2 text-[11px] tracking-[0.18em] text-subtle uppercase">Pedidos</p>
          <div className="flex flex-col gap-1.5">
            {props.incoming.map((r) => (
              <div
                key={r.username}
                className="flex items-center gap-2 rounded-xl bg-bg-subtle px-2.5 py-2 shadow-[var(--shadow-border)]"
              >
                <UserPlus className="size-3.5 text-muted" />
                <span className="min-w-0 flex-1 truncate text-sm">@{r.username}</span>
                <button
                  type="button"
                  aria-label="Aceitar"
                  className="grid size-8 place-items-center rounded-full bg-live/15 text-live"
                  onClick={() => void props.onRespond(r.username, true)}
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Recusar"
                  className="grid size-8 place-items-center rounded-full bg-bg text-muted"
                  onClick={() => void props.onRespond(r.username, false)}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {props.outgoing.length > 0 && (
        <div className="mt-4 px-4">
          <p className="mb-1 text-[11px] tracking-[0.18em] text-subtle uppercase">Enviados</p>
          {props.outgoing.map((u) => (
            <p key={u} className="py-1 text-sm text-muted">
              @{u} · pendente
            </p>
          ))}
        </div>
      )}

      <p className="mt-5 px-4 text-[11px] tracking-[0.18em] text-subtle uppercase">
        Amigos · {props.friends.length}
      </p>
      <div className="mt-1 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {props.friends.length === 0 && (
          <p className="px-2 py-3 text-sm text-muted">
            Adicione alguém pelo @usuario para chamar e conversar.
          </p>
        )}
        {props.friends.map((f) => {
          const selected = props.selected === f.username;
          return (
            <button
              key={f.userId}
              type="button"
              onClick={() => props.onSelect(f.username)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition-colors duration-150",
                selected ? "bg-bg-subtle" : "hover:bg-bg-subtle/60",
              )}
            >
              <span className="relative grid size-9 place-items-center rounded-full bg-bg-elevated text-xs font-semibold tracking-wide shadow-[var(--shadow-border)]">
                {f.displayName.slice(0, 1).toUpperCase()}
                <span
                  className={cn(
                    "absolute right-0 bottom-0 size-2 rounded-full",
                    f.online ? "bg-live" : "bg-subtle",
                  )}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{f.displayName}</span>
                  {unread[f.username] && !selected && (
                    <span className="size-1.5 rounded-full bg-live" />
                  )}
                </span>
                <span className="block truncate text-xs text-muted">
                  @{f.username}
                  {f.inCall ? " · em chamada" : f.online ? " · online" : ""}
                </span>
              </span>
              <span
                role="button"
                aria-label={`Chamar ${f.username}`}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onCall(f.username);
                }}
                className={cn(
                  "grid size-9 place-items-center rounded-full transition-colors",
                  f.online
                    ? "bg-live/15 text-live hover:bg-live/25"
                    : "bg-transparent text-subtle",
                )}
              >
                <Phone className="size-3.5" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
