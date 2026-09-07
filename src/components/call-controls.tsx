import type { ReactNode } from "react";
import {
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Smartphone,
  SwitchCamera,
  Video,
  VideoOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ControlButton(props: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        "relative grid size-12 place-items-center rounded-full shadow-[var(--shadow-border)] transition-[transform,background-color,opacity] duration-150 active:scale-[0.96] disabled:opacity-40",
        props.danger
          ? "bg-danger text-danger-fg"
          : props.active
            ? "bg-accent text-accent-fg"
            : "bg-bg-subtle text-fg hover:bg-bg-elevated",
      )}
    >
      {props.children}
      {props.badge ? (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-fg tabular-nums">
          {props.badge}
        </span>
      ) : null}
    </button>
  );
}

export function CallControls(props: {
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  phoneActive: boolean;
  chatOpen: boolean;
  unread: number;
  fullscreen: boolean;
  canShare: boolean;
  onMic: () => void;
  onCam: () => void;
  onShare: () => void;
  onPhone: () => void;
  onFlip: () => void;
  onChat: () => void;
  onFullscreen: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-bg/80 px-3 py-2 shadow-[var(--shadow-border)] backdrop-blur-md">
      <ControlButton label={props.micOn ? "Silenciar" : "Ativar microfone"} onClick={props.onMic}>
        {props.micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
      </ControlButton>
      <ControlButton
        label={props.camOn ? "Desligar câmera" : "Ligar câmera"}
        onClick={props.onCam}
        disabled={props.sharing || props.phoneActive}
      >
        {props.camOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
      </ControlButton>
      <ControlButton
        label={props.sharing ? "Parar tela" : "Compartilhar tela"}
        onClick={props.onShare}
        active={props.sharing}
        disabled={!props.canShare}
      >
        {props.sharing ? <MonitorOff className="size-4" /> : <MonitorUp className="size-4" />}
      </ControlButton>
      <ControlButton label="Celular como webcam" onClick={props.onPhone} active={props.phoneActive}>
        <Smartphone className="size-4" />
      </ControlButton>
      <ControlButton label="Virar câmera" onClick={props.onFlip}>
        <SwitchCamera className="size-4" />
      </ControlButton>
      <ControlButton
        label="Chat"
        onClick={props.onChat}
        active={props.chatOpen}
        badge={props.chatOpen ? 0 : props.unread}
      >
        <MessageSquare className="size-4" />
      </ControlButton>
      <ControlButton
        label={props.fullscreen ? "Sair da tela cheia" : "Tela cheia"}
        onClick={props.onFullscreen}
      >
        {props.fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </ControlButton>
      <ControlButton label="Encerrar" danger onClick={props.onEnd}>
        <PhoneOff className="size-4" />
      </ControlButton>
    </div>
  );
}
