import { useCallback, useEffect, useRef, useState } from "react";

export type Facing = "user" | "environment";

export function useLocalMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [facing, setFacing] = useState<Facing>("user");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>();
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>();
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const phoneTrackRef = useRef<MediaStreamTrack | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list);
    } catch {
      /* permission not granted yet */
    }
  }, []);

  const acquireCamera = useCallback(
    async (opts?: { facing?: Facing; videoId?: string; audioId?: string }) => {
      const nextFacing = opts?.facing ?? facing;
      const videoId = opts?.videoId ?? videoDeviceId;
      const audioId = opts?.audioId ?? audioDeviceId;
      const video: MediaTrackConstraints = videoId
        ? { deviceId: { exact: videoId } }
        : { facingMode: nextFacing, width: { ideal: 1280 }, height: { ideal: 720 } };
      const audio: MediaTrackConstraints | boolean = audioId
        ? { deviceId: { exact: audioId }, echoCancellation: true, noiseSuppression: true }
        : { echoCancellation: true, noiseSuppression: true };
      const next = await navigator.mediaDevices.getUserMedia({ video, audio });
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = next;
      next.getAudioTracks().forEach((t) => (t.enabled = micOn));
      next.getVideoTracks().forEach((t) => (t.enabled = camOn && !sharing && !phoneTrackRef.current));
      setStream(composeOutgoing());
      setError(null);
      await refreshDevices();
      return next;
    },
    [facing, videoDeviceId, audioDeviceId, micOn, camOn, sharing, refreshDevices],
  );

  function composeOutgoing(): MediaStream {
    const out = new MediaStream();
    const cam = cameraStreamRef.current;
    const screen = screenStreamRef.current;
    const phone = phoneTrackRef.current;
    const audio = cam?.getAudioTracks()[0];
    if (audio) out.addTrack(audio);
    const video = phone ?? screen?.getVideoTracks()[0] ?? cam?.getVideoTracks()[0];
    if (video) out.addTrack(video);
    return out;
  }

  const start = useCallback(async () => {
    try {
      return await acquireCamera();
    } catch {
      setError("Precisamos da câmera e do microfone. Permita o acesso e tente de novo.");
      return null;
    }
  }, [acquireCamera]);

  const stop = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    phoneTrackRef.current = null;
    setStream(null);
    setSharing(false);
  }, []);

  const toggleMic = useCallback(() => {
    setMicOn((prev) => {
      const next = !prev;
      cameraStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      stream?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, [stream]);

  const toggleCam = useCallback(() => {
    if (sharing || phoneTrackRef.current) return;
    setCamOn((prev) => {
      const next = !prev;
      cameraStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
      stream?.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, [sharing, stream]);

  const startScreenShare = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = screen;
      const track = screen.getVideoTracks()[0];
      if (track) track.onended = () => {
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        setSharing(false);
        setStream(composeOutgoing());
      };
      setSharing(true);
      setStream(composeOutgoing());
      return track ?? null;
    } catch {
      return null;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setSharing(false);
    setStream(composeOutgoing());
  }, []);

  const setPhoneTrack = useCallback((track: MediaStreamTrack | null) => {
    phoneTrackRef.current = track;
    if (track) {
      track.addEventListener("ended", () => {
        if (phoneTrackRef.current === track) {
          phoneTrackRef.current = null;
          setStream(composeOutgoing());
        }
      });
    }
    setStream(composeOutgoing());
  }, []);

  const flipCamera = useCallback(async () => {
    const next: Facing = facing === "user" ? "environment" : "user";
    setFacing(next);
    try {
      await acquireCamera({ facing: next, videoId: undefined });
      setVideoDeviceId(undefined);
    } catch {
      setError("Não foi possível trocar a câmera.");
    }
  }, [facing, acquireCamera]);

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    stream,
    error,
    micOn,
    camOn,
    sharing,
    facing,
    devices,
    videoDeviceId,
    audioDeviceId,
    setVideoDeviceId,
    setAudioDeviceId,
    start,
    stop,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    setPhoneTrack,
    flipCamera,
    acquireCamera,
    phoneActive: Boolean(phoneTrackRef.current),
  };
}
