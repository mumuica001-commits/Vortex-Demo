import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RingingCall } from "@/lib/vortex/types";

export function IncomingCall(props: {
  call: RingingCall;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed inset-x-0 top-0 z-40 flex justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex w-full max-w-lg items-center gap-3 rounded-[24px] bg-bg-elevated px-4 py-3 shadow-[var(--shadow-border)]">
        <span className="pulse-live grid size-11 shrink-0 place-items-center rounded-full bg-live/15 text-live">
          <Phone className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold">
            {props.call.fromDisplayName}
          </p>
          <p className="truncate text-xs text-muted">@{props.call.fromUsername} está te chamando</p>
        </div>
        <Button type="button" variant="danger" size="icon-sm" onClick={props.onDecline} aria-label="Recusar">
          <PhoneOff className="size-3.5" />
        </Button>
        <Button type="button" size="icon-sm" onClick={props.onAccept} aria-label="Atender" className="bg-live text-accent-fg">
          <Phone className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
