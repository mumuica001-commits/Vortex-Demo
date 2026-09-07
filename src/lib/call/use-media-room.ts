import { useCallback, useEffect, useRef, useState } from "react";
import { MediaRoom, type ControlMessage, type MediaPeer } from "./media-room";

export interface UseMediaRoomOptions {
  room: string;
  selfId: string;
  name?: string;
  maxPeers?: number;
  localStream: MediaStream | null;
  enabled?: boolean;
}

export function useMediaRoom(options: UseMediaRoomOptions) {
  const { room, selfId, name, maxPeers, localStream, enabled = true } = options;
  const [peers, setPeers] = useState<MediaPeer[]>([]);
  const [joined, setJoined] = useState(false);
  const [roomFull, setRoomFull] = useState(false);
  const roomRef = useRef<MediaRoom | null>(null);
  const listeners = useRef(new Set<(from: string, msg: ControlMessage) => void>());

  useEffect(() => {
    if (!enabled) return;
    const media = new MediaRoom({
      room,
      selfId,
      name,
      maxPeers,
      onPeersChanged: setPeers,
      onRoomFull: () => setRoomFull(true),
      onConnected: () => setJoined(true),
      onControl: (from, msg) => {
        for (const fn of listeners.current) fn(from, msg);
      },
    });
    roomRef.current = media;
    void media.join();
    return () => {
      roomRef.current = null;
      media.close();
      setPeers([]);
      setJoined(false);
      setRoomFull(false);
    };
  }, [room, selfId, name, maxPeers, enabled]);

  useEffect(() => {
    roomRef.current?.setLocalStream(localStream);
  }, [localStream]);

  const sendControl = useCallback((msg: ControlMessage, peerId?: string) => {
    roomRef.current?.sendControl(msg, peerId);
  }, []);

  const replaceVideoTrack = useCallback(async (track: MediaStreamTrack | null) => {
    await roomRef.current?.replaceVideoTrack(track);
  }, []);

  const onControl = useCallback((fn: (from: string, msg: ControlMessage) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  return { peers, joined, roomFull, sendControl, replaceVideoTrack, onControl };
}
