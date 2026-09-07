/**
 * 1:1 / small-group WebRTC with media tracks + a reliable control channel.
 * Signaling is the same /api/rtc relay as P2PRoom (perfect negotiation).
 */
import { defaultIceServers, type PeerInfo, type RtcPollResponse, type SignalKind } from "@/lib/multiplayer";

export type ControlMessage =
  | { t: "chat"; text: string; at: number }
  | { t: "state"; mic: boolean; cam: boolean; screen: boolean; name: string };

export interface MediaPeer extends PeerInfo {
  stream: MediaStream | null;
}

export interface MediaRoomOptions {
  room: string;
  selfId: string;
  name?: string;
  maxPeers?: number;
  iceServers?: RTCIceServer[];
  onPeersChanged?: (peers: MediaPeer[]) => void;
  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  onControl?: (from: string, msg: ControlMessage) => void;
  onConnected?: () => void;
  onRoomFull?: () => void;
}

interface PeerSlot {
  pc: RTCPeerConnection;
  reliable?: RTCDataChannel;
  remoteStream: MediaStream | null;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  lastProgressAt: number;
  recoveryAttempts: number;
  terminal?: boolean;
  recreatedForOffer?: boolean;
  info: MediaPeer;
}

const FAST_POLL_MS = 400;
const IDLE_POLL_MS = 2000;
const STALL_MS = 10_000;
const MAX_RECOVERY_ATTEMPTS = 3;
const SIGNAL_RETRY_DELAYS_MS = [250, 750];

export class MediaRoom {
  private readonly opts: MediaRoomOptions;
  private readonly peers = new Map<string, PeerSlot>();
  private readonly signalQueues = new Map<string, Promise<void>>();
  private cursor = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private everPolled = false;
  private lastPeersFingerprint = "";
  private localStream: MediaStream | null = null;
  private roomFull = false;

  constructor(opts: MediaRoomOptions) {
    this.opts = opts;
  }

  async join(): Promise<void> {
    try {
      await this.pollOnce();
    } catch {
      /* first poll can fail transiently */
    }
    if (this.closed) return;
    this.schedulePoll(this.anyPairConnecting() ? FAST_POLL_MS : IDLE_POLL_MS);
    this.watchdogTimer = setInterval(() => this.watchdog(), 2000);
  }

  close(): void {
    this.closed = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    for (const slot of this.peers.values()) slot.pc.close();
    this.peers.clear();
    void fetch("/api/rtc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "leave", room: this.opts.room, peer: this.opts.selfId }),
      keepalive: true,
    }).catch(() => {});
  }

  setLocalStream(stream: MediaStream | null): void {
    this.localStream = stream;
    for (const slot of this.peers.values()) {
      void this.syncSenders(slot);
    }
  }

  async replaceVideoTrack(track: MediaStreamTrack | null): Promise<void> {
    for (const slot of this.peers.values()) {
      const sender = slot.pc.getSenders().find((s) => s.track?.kind === "video" || s.track === null);
      const videoSender =
        slot.pc.getSenders().find((s) => s.track?.kind === "video") ??
        slot.pc.getSenders().find((s) => !s.track);
      if (videoSender) {
        await videoSender.replaceTrack(track);
      } else if (track && this.localStream) {
        slot.pc.addTrack(track, this.localStream);
      }
      void sender;
    }
  }

  sendControl(msg: ControlMessage, peerId?: string): void {
    const wire = JSON.stringify(msg);
    const targets = peerId ? [this.peers.get(peerId)] : [...this.peers.values()];
    for (const slot of targets) {
      if (slot?.reliable?.readyState === "open") slot.reliable.send(wire);
    }
  }

  peerList(): MediaPeer[] {
    return [...this.peers.values()].map((s) => ({ ...s.info, stream: s.remoteStream }));
  }

  private maxPeers(): number {
    return this.opts.maxPeers ?? 2;
  }

  private async syncSenders(slot: PeerSlot): Promise<void> {
    const stream = this.localStream;
    if (!stream) return;
    const senders = slot.pc.getSenders();
    for (const track of stream.getTracks()) {
      const existing = senders.find((s) => s.track?.kind === track.kind);
      if (existing) {
        if (existing.track !== track) await existing.replaceTrack(track);
      } else {
        slot.pc.addTrack(track, stream);
      }
    }
  }

  private schedulePoll(delay: number): void {
    if (this.closed) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => void this.poll(), delay);
  }

  private anyPairConnecting(): boolean {
    for (const s of this.peers.values()) {
      if (s.terminal) continue;
      if (s.info.connectionState !== "connected") return true;
    }
    return false;
  }

  private async pollOnce(): Promise<void> {
    const params = new URLSearchParams({
      room: this.opts.room,
      peer: this.opts.selfId,
      name: this.opts.name ?? "",
      since: String(this.cursor),
    });
    const res = await fetch(`/api/rtc?${params}`);
    if (this.closed) return;
    if (!res.ok) throw new Error(`signaling poll failed: ${res.status}`);
    const body = (await res.json()) as RtcPollResponse;
    if (this.closed) return;
    if (!this.everPolled) {
      this.everPolled = true;
      this.opts.onConnected?.();
    }
    this.reconcileRoster(body.peers);
    const roster = new Set(body.peers.map((p) => p.id));
    for (const sig of body.signals) {
      this.cursor = Math.max(this.cursor, sig.id);
      await this.onSignal(sig.from, sig.kind, sig.payload, roster);
      if (this.closed) return;
    }
  }

  private async poll(): Promise<void> {
    if (this.closed) return;
    try {
      await this.pollOnce();
    } catch {
      /* retry */
    }
    this.schedulePoll(this.anyPairConnecting() ? FAST_POLL_MS : IDLE_POLL_MS);
  }

  private reconcileRoster(peers: { id: string; name: string }[]): void {
    const others = peers.filter((p) => p.id !== this.opts.selfId);
    if (others.length >= this.maxPeers() && this.peers.size === 0) {
      // We arrived to a full room and have no existing pair — bail.
      if (!this.roomFull) {
        this.roomFull = true;
        this.opts.onRoomFull?.();
      }
      return;
    }

    const alive = new Set(others.map((p) => p.id));
    let connecting = 0;
    for (const p of others) {
      if (this.peers.has(p.id)) {
        const existing = this.peers.get(p.id)!;
        existing.info.name = p.name;
        continue;
      }
      if (this.peers.size + connecting >= this.maxPeers() - 1 && this.maxPeers() <= 2) {
        // 1:1: only pair with the first other peer
        if (this.peers.size >= 1) continue;
      }
      connecting += 1;
      this.connectTo(p.id, p.name, this.opts.selfId > p.id);
    }
    for (const [id, slot] of this.peers) {
      if (!alive.has(id)) {
        slot.pc.close();
        this.peers.delete(id);
      }
    }
    this.emitPeers();
  }

  private connectTo(peerId: string, name: string, initiator: boolean): PeerSlot | null {
    if (this.closed) return null;
    const pc = new RTCPeerConnection({
      iceServers: this.opts.iceServers ?? defaultIceServers(),
    });
    const slot: PeerSlot = {
      pc,
      remoteStream: null,
      makingOffer: false,
      ignoreOffer: false,
      pendingCandidates: [],
      lastProgressAt: Date.now(),
      recoveryAttempts: 0,
      info: {
        id: peerId,
        name,
        connectionState: pc.connectionState,
        candidateType: null,
        rttMs: null,
        stream: null,
      },
    };
    this.peers.set(peerId, slot);

    pc.onicecandidate = (e) => {
      if (e.candidate) void this.sendSignal(peerId, "ice", e.candidate.toJSON());
    };
    pc.onconnectionstatechange = () => {
      slot.info.connectionState = pc.connectionState;
      if (pc.connectionState === "connecting" || pc.connectionState === "connected") {
        slot.lastProgressAt = Date.now();
      }
      if (pc.connectionState === "connected") {
        slot.recoveryAttempts = 0;
        slot.terminal = false;
      }
      this.emitPeers();
      if (pc.connectionState === "failed") pc.restartIce();
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        this.schedulePoll(FAST_POLL_MS);
      }
    };
    pc.onnegotiationneeded = async () => {
      try {
        slot.makingOffer = true;
        await pc.setLocalDescription();
        await this.sendSignal(peerId, "offer", pc.localDescription!.toJSON());
      } catch {
        /* next cycle */
      } finally {
        slot.makingOffer = false;
      }
    };
    pc.ondatachannel = (e) => this.attachChannel(slot, e.channel);
    pc.ontrack = (ev) => {
      let stream = ev.streams[0];
      if (!stream) {
        stream = slot.remoteStream ?? new MediaStream();
        if (!stream.getTracks().includes(ev.track)) stream.addTrack(ev.track);
      }
      slot.remoteStream = stream;
      slot.info.stream = stream;
      this.opts.onRemoteStream?.(peerId, stream);
      this.emitPeers();
    };

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }
    if (initiator) {
      this.attachChannel(slot, pc.createDataChannel("reliable", { ordered: true }));
    }
    return slot;
  }

  private attachChannel(slot: PeerSlot, channel: RTCDataChannel): void {
    if (channel.label === "reliable" || !slot.reliable) slot.reliable = channel;
    channel.onopen = () => {
      slot.lastProgressAt = Date.now();
    };
    channel.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as ControlMessage;
        if (msg && (msg.t === "chat" || msg.t === "state")) {
          this.opts.onControl?.(slot.info.id, msg);
        }
      } catch {
        /* ignore */
      }
    };
  }

  private async flushPendingCandidates(slot: PeerSlot): Promise<void> {
    while (slot.pendingCandidates.length > 0) {
      const candidate = slot.pendingCandidates.shift()!;
      try {
        await slot.pc.addIceCandidate(candidate);
      } catch {
        /* glare */
      }
      if (this.closed) return;
    }
  }

  private async onSignal(
    from: string,
    kind: SignalKind,
    payload: unknown,
    roster: Set<string>,
  ): Promise<void> {
    if (this.closed) return;
    let slot = this.peers.get(from);
    if (!slot) {
      if (!roster.has(from)) return;
      const created = this.connectTo(from, "", false);
      if (!created) return;
      slot = created;
    }
    const polite = this.opts.selfId < from;

    try {
      if (kind === "offer" || kind === "answer") {
        const description = payload as RTCSessionDescriptionInit;
        const collision =
          kind === "offer" && (slot.makingOffer || slot.pc.signalingState !== "stable");
        slot.ignoreOffer = !polite && collision;
        if (slot.ignoreOffer) return;
        try {
          await slot.pc.setRemoteDescription(description);
        } catch (err) {
          if (kind !== "offer" || slot.recreatedForOffer) throw err;
          const attempts = slot.recoveryAttempts;
          const name = slot.info.name;
          slot.pc.close();
          this.peers.delete(from);
          const fresh = this.connectTo(from, name, false);
          if (!fresh) return;
          fresh.recoveryAttempts = attempts;
          fresh.recreatedForOffer = true;
          slot = fresh;
          await slot.pc.setRemoteDescription(description);
        }
        if (this.closed) return;
        await this.flushPendingCandidates(slot);
        if (this.closed) return;
        if (kind === "offer") {
          await slot.pc.setLocalDescription();
          if (this.closed) return;
          await this.sendSignal(from, "answer", slot.pc.localDescription!.toJSON());
        }
      } else if (kind === "ice") {
        const candidate = payload as RTCIceCandidateInit;
        if (!slot.pc.remoteDescription) {
          slot.pendingCandidates.push(candidate);
          return;
        }
        try {
          await slot.pc.addIceCandidate(candidate);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* next offer cycle */
    }
  }

  private sendSignal(to: string, kind: SignalKind, payload: unknown): Promise<void> {
    const prev = this.signalQueues.get(to) ?? Promise.resolve();
    const next = prev.then(() => this.postSignal(to, kind, payload));
    this.signalQueues.set(
      to,
      next.catch(() => {}),
    );
    return next;
  }

  private async postSignal(to: string, kind: SignalKind, payload: unknown): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      if (this.closed) return;
      try {
        const res = await fetch("/api/rtc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            op: "signal",
            room: this.opts.room,
            from: this.opts.selfId,
            to,
            kind,
            payload,
          }),
        });
        if (res.ok) return;
        throw new Error(`signal POST failed: ${res.status}`);
      } catch (err) {
        if (attempt >= SIGNAL_RETRY_DELAYS_MS.length) {
          console.warn(`[media] signal ${kind} to ${to} failed after retries`, err);
          return;
        }
        await new Promise((r) => setTimeout(r, SIGNAL_RETRY_DELAYS_MS[attempt]));
      }
    }
  }

  private watchdog(): void {
    if (this.closed) return;
    const now = Date.now();
    for (const [peerId, slot] of this.peers) {
      const live = slot.pc.connectionState;
      if (live !== slot.info.connectionState) {
        slot.info.connectionState = live;
        if (live === "connecting" || live === "connected") slot.lastProgressAt = now;
        this.emitPeers();
      }
      if (slot.terminal || live === "connected") continue;
      if (now - slot.lastProgressAt <= STALL_MS) continue;
      if (slot.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
        slot.terminal = true;
        this.emitPeers();
        continue;
      }
      slot.recoveryAttempts += 1;
      slot.lastProgressAt = now;
      if (this.opts.selfId > peerId) {
        const { name } = slot.info;
        const attempts = slot.recoveryAttempts;
        slot.pc.close();
        this.peers.delete(peerId);
        const fresh = this.connectTo(peerId, name, true);
        if (fresh) fresh.recoveryAttempts = attempts;
        this.schedulePoll(FAST_POLL_MS);
      }
    }
  }

  private emitPeers(): void {
    const list = this.peerList();
    const fingerprint = JSON.stringify(
      list.map((p) => [p.id, p.name, p.connectionState, p.stream?.id ?? ""]),
    );
    if (fingerprint === this.lastPeersFingerprint) return;
    this.lastPeersFingerprint = fingerprint;
    this.opts.onPeersChanged?.(list);
  }
}
