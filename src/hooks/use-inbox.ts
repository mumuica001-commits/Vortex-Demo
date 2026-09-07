import { useCallback, useEffect, useRef, useState } from "react";
import { syncInbox } from "@/lib/vortex/fns";
import type { Inbox } from "@/lib/vortex/types";

export function useInbox(opts: {
  enabled: boolean;
  inCall: boolean;
  chatWith: string | null;
  displayName?: string | null;
  email?: string | null;
}) {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chatWith = opts.chatWith;
  const inCall = opts.inCall;

  const tick = useCallback(async () => {
    if (!opts.enabled) return;
    try {
      const next = await syncInbox({
        data: {
          inCall,
          chatWith: chatWith ?? undefined,
          displayName: opts.displayName ?? undefined,
          email: opts.email ?? undefined,
        },
      });
      setInbox(next);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao sincronizar";
      if (message !== "Unauthorized") setError(message);
    }
  }, [opts.enabled, inCall, chatWith, opts.displayName, opts.email]);

  useEffect(() => {
    if (!opts.enabled) return;
    void tick();
    const id = window.setInterval(() => void tick(), inCall ? 8000 : 3000);
    return () => window.clearInterval(id);
  }, [opts.enabled, tick, inCall]);

  const lastRing = useRef<string | null>(null);
  useEffect(() => {
    const id = inbox?.ringing?.id ?? null;
    if (id && id !== lastRing.current) {
      lastRing.current = id;
      try {
        navigator.vibrate?.([180, 80, 180, 80, 240]);
      } catch {
        /* ignore */
      }
    }
    if (!id) lastRing.current = null;
  }, [inbox?.ringing?.id]);

  return { inbox, error, refresh: tick };
}
