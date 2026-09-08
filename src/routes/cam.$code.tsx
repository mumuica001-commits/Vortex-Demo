import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SwitchCamera, Video } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { VideoTile } from "@/components/video-tile";
import { Button } from "@/components/ui/button";
import { useLocalMedia } from "@/hooks/use-local-media";
import { useMediaRoom } from "@/lib/call/use-media-room";
import { makePeerId, normalizeRoomCode, webcamRoomId } from "@/lib/call/ids";

export const Route = createFileRoute("/cam/$code")({ component: CamPage });

function CamPage() {
  const { code: raw } = Route.useParams();
  const code = normalizeRoomCode(raw);
  const media = useLocalMedia();
  const [selfId] = useState(() => makePeerId("phone"));

  const room = useMediaRoom({
    room: webcamRoomId(code),
    selfId,
    name: "celular",
    maxPeers: 2,
    localStream: media.stream,
    enabled: Boolean(code),
  });

  useEffect(() => {
    void (async () => {
      try {
        await media.acquireCamera({ facing: "environment" });
      } catch {
        await media.start();
      }
    })();
    return () => media.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const linked = room.peers.some((p) => p.connectionState === "connected");

  return (
    <main className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between px-4 py-3">
        <BrandMark />
        <span className="font-display text-xs tracking-[0.2em] text-muted tabular-nums">
          {code}
        </span>
      </header>
      <div className="relative mx-3 mb-3 flex-1 overflow-hidden rounded-[28px] bg-bg-elevated shadow-[var(--shadow-border)]">
        <VideoTile
          stream={media.stream}
          muted
          className="absolute inset-0"
          label={linked ? "Enviando para o computador" : "Procurando o computador…"}
        />
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          <Button type="button" variant="secondary" size="icon" onClick={() => void media.flipCamera()}>
            <SwitchCamera className="size-4" />
          </Button>
        </div>
      </div>
      <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <Video className="size-4 text-live" />
          {linked
            ? "Este celular está funcionando como webcam."
            : "Mantenha esta tela aberta. O computador precisa estar no mesmo código."}
        </p>
        {media.error && <p className="mt-2 text-sm text-danger">{media.error}</p>}
        <p className="mt-3">
          <Link to="/" className="text-sm text-fg underline-offset-4 hover:underline">
            Voltar ao Vortex
          </Link>
        </p>
      </div>
    </main>
  );
}
