import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { CallControls } from "@/components/call-controls";
import { PhoneCamPair } from "@/components/phone-cam-pair";
import { VideoTile } from "@/components/video-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/brand-mark";
import { useLocalMedia } from "@/hooks/use-local-media";
import { useMediaRoom } from "@/lib/call/use-media-room";
import { callRoomId, makePeerId, normalizeRoomCode, randomCode, webcamRoomId } from "@/lib/call/ids";
import { toQrSvg } from "@/lib/call/qr";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { syncInbox } from "@/lib/vortex/fns";
import { cn } from "@/lib/utils";
import type { ControlMessage } from "@/lib/call/media-room";

export const Route = createFileRoute("/call/$roomId")({ component: CallPage });

type ChatLine = { id: string; from: "me" | "them"; text: string; at: number };

function CallPage() {
  const { roomId: raw } = Route.useParams();
  const code = normalizeRoomCode(raw);
  const navigate = useNavigate();
  const { user } = useCurrentUserState();
  const media = useLocalMedia();
  const [selfId] = useState(() => makePeerId(user?.id));
  const [camPeerId] = useState(() => makePeerId(`cam${user?.id ?? "g"}`));
  const displayName = user?.displayName || "Você";
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [unread, setUnread] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [camCode, setCamCode] = useState<string | null>(null);
  const [pairOpen, setPairOpen] = useState(false);
  const [qr, setQr] = useState("");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const chatEnd = useRef<HTMLDivElement | null>(null);

  const room = callRoomId(code);
  const call = useMediaRoom({
    room,
    selfId,
    name: displayName,
    maxPeers: 2,
    localStream: media.stream,
    enabled: Boolean(code),
  });

  const cam = useMediaRoom({
    room: webcamRoomId(camCode ?? "idle"),
    selfId: camPeerId,
    name: "desktop",
    maxPeers: 2,
    localStream: null,
    enabled: Boolean(camCode),
  });

  useEffect(() => {
    void media.start();
    return () => media.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("vortex.openCam") === "1") {
        sessionStorage.removeItem("vortex.openCam");
        setCamCode(randomCode(6));
        setPairOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const track = media.stream?.getVideoTracks()[0] ?? null;
    void call.replaceVideoTrack(track);
  }, [media.stream, call.replaceVideoTrack]);

  useEffect(() => {
    const phone = cam.peers.find((p) => p.stream?.getVideoTracks().length);
    const track = phone?.stream?.getVideoTracks()[0] ?? null;
    media.setPhoneTrack(track);
  }, [cam.peers, media.setPhoneTrack]);

  useEffect(() => {
    if (typeof window === "undefined" || !code) return;
    void toQrSvg(`${window.location.origin}/call/${code}`).then(setQr);
  }, [code]);

  useEffect(() => {
    return call.onControl((_from, msg: ControlMessage) => {
      if (msg.t === "chat") {
        setMessages((prev) => [
          ...prev,
          { id: `${msg.at}-r`, from: "them", text: msg.text, at: msg.at },
        ]);
        setUnread((n) => n + 1);
      }
    });
  }, [call.onControl]);

  useEffect(() => {
    if (chatOpen) setUnread(0);
  }, [chatOpen, messages.length]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  useEffect(() => {
    if (!user) return;
    const payload = {
      data: {
        inCall: true,
        displayName: user.displayName ?? undefined,
        email: user.primaryEmail ?? undefined,
      },
    };
    void syncInbox(payload).catch(() => {});
    const id = window.setInterval(() => {
      void syncInbox(payload).catch(() => {});
    }, 10000);
    return () => window.clearInterval(id);
  }, [user]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const remote = call.peers.find((p) => p.stream) ?? call.peers[0] ?? null;
  const connected = remote?.connectionState === "connected" && Boolean(remote.stream);
  const phoneConnected = cam.peers.some(
    (p) => p.connectionState === "connected" && (p.stream?.getVideoTracks().length ?? 0) > 0,
  );

  const status = useMemo(() => {
    if (call.roomFull) return "Esta sala já está cheia.";
    if (media.error) return media.error;
    if (!connected) return "Aguardando a outra pessoa entrar…";
    if (media.sharing) return "Compartilhando a tela";
    if (media.phoneActive) return "Usando o celular como webcam";
    return "Conectado";
  }, [call.roomFull, media.error, media.sharing, media.phoneActive, connected]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/call/${code}`);
      toast("Link copiado");
    } catch {
      toast("Não foi possível copiar");
    }
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const at = Date.now();
    call.sendControl({ t: "chat", text, at });
    setMessages((prev) => [...prev, { id: `${at}-me`, from: "me", text, at }]);
    setChatInput("");
  }

  async function onShare() {
    if (media.sharing) media.stopScreenShare();
    else await media.startScreenShare();
  }

  function onPhone() {
    setCamCode((c) => c ?? randomCode(6));
    setPairOpen(true);
  }

  function onFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  }

  function end() {
    media.stop();
    void navigate({ to: "/" });
  }

  return (
    <main className="glow-field flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <BrandMark />
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="hidden sm:inline">{status}</span>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-bg-subtle px-3 font-medium text-fg shadow-[var(--shadow-border)]"
          >
            <Link2 className="size-3.5" />
            <span className="font-display tracking-[0.18em] tabular-nums">{code}</span>
            <Copy className="size-3.5 text-muted" />
          </button>
        </div>
      </header>

      <div
        ref={stageRef}
        className={cn(
          "relative mx-auto mb-4 w-full max-w-6xl flex-1 overflow-hidden bg-bg",
          fullscreen ? "rounded-none" : "rounded-[28px] shadow-[var(--shadow-border)]",
        )}
      >
        {connected && remote?.stream ? (
          <VideoTile
            stream={remote.stream}
            className="absolute inset-0"
            label={remote.name || "Convidado"}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center px-6">
            <div className="max-w-sm text-center">
              {qr && (
                <div
                  className="mx-auto mb-5 w-40 overflow-hidden rounded-3xl bg-fg p-2"
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
              )}
              <p className="font-display text-2xl font-semibold tracking-[0.2em] tabular-nums">
                {code}
              </p>
              <p className="mt-2 text-sm text-muted">
                {call.roomFull
                  ? "Esta sala já tem duas pessoas. Crie outra."
                  : "Compartilhe o código ou o QR para a outra pessoa entrar."}
              </p>
              <Button type="button" variant="secondary" className="mt-4" onClick={() => void copyLink()}>
                Copiar link
              </Button>
            </div>
          </div>
        )}

        <div className="absolute right-4 bottom-24 w-[28%] min-w-[120px] max-w-[220px] overflow-hidden rounded-2xl shadow-[var(--shadow-border)] sm:bottom-28">
          <VideoTile
            stream={media.stream}
            muted
            mirror={!media.sharing && !media.phoneActive && media.facing === "user"}
            className="aspect-[3/4] sm:aspect-[4/3]"
            label={media.sharing ? "Sua tela" : media.phoneActive ? "Celular" : "Você"}
          />
        </div>

        {chatOpen && (
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-bg/92 shadow-[var(--shadow-border)] backdrop-blur-md sm:w-80">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="font-display text-sm font-semibold">Chat da chamada</p>
              <button type="button" className="text-sm text-muted" onClick={() => setChatOpen(false)}>
                Fechar
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4">
              {messages.length === 0 && (
                <p className="py-6 text-center text-sm text-muted">Mensagens só nesta chamada.</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.from === "me" ? "ml-auto bg-accent text-accent-fg" : "bg-bg-subtle",
                  )}
                >
                  {m.text}
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <form onSubmit={sendChat} className="flex gap-2 p-3">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Mensagem…"
                className="h-10"
                disabled={!connected}
              />
              <Button type="submit" size="sm" disabled={!connected}>
                Enviar
              </Button>
            </form>
          </aside>
        )}

        <div className="absolute inset-x-0 bottom-4 flex justify-center px-3">
          <CallControls
            micOn={media.micOn}
            camOn={media.camOn}
            sharing={media.sharing}
            phoneActive={media.phoneActive}
            chatOpen={chatOpen}
            unread={unread}
            fullscreen={fullscreen}
            canShare={
              typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia)
            }
            onMic={media.toggleMic}
            onCam={media.toggleCam}
            onShare={() => void onShare()}
            onPhone={onPhone}
            onFlip={() => void media.flipCamera()}
            onChat={() => setChatOpen((o) => !o)}
            onFullscreen={onFullscreen}
            onEnd={end}
          />
        </div>
      </div>

      {media.error && <p className="px-4 py-3 text-center text-sm text-danger">{media.error}</p>}

      {pairOpen && camCode && (
        <PhoneCamPair
          code={camCode}
          connected={phoneConnected}
          onClose={() => setPairOpen(false)}
        />
      )}
    </main>
  );
}
