import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function VideoTile(props: {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== props.stream) el.srcObject = props.stream;
  }, [props.stream]);

  return (
    <div className={cn("relative overflow-hidden bg-bg", props.className)}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={props.muted}
        className={cn("h-full w-full object-cover", props.mirror && "scale-x-[-1]")}
      />
      {props.label && (
        <span className="absolute bottom-3 left-3 rounded-full bg-bg/70 px-2.5 py-1 text-[11px] font-medium tracking-wide text-fg shadow-[var(--shadow-border)]">
          {props.label}
        </span>
      )}
    </div>
  );
}
