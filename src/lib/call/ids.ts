const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(length = 6): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += ROOM_CHARS[bytes[i]! % ROOM_CHARS.length];
  }
  return out;
}

export function normalizeRoomCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
}

/** Signaling room id for a 1:1 video call. */
export function callRoomId(code: string): string {
  return `v${normalizeRoomCode(code).toLowerCase()}`.slice(0, 64);
}

/** Signaling room id for phone-as-webcam pairing. */
export function webcamRoomId(code: string): string {
  return `w${normalizeRoomCode(code).toLowerCase()}`.slice(0, 64);
}

export function makePeerId(seed?: string): string {
  const clean = (seed ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
  const rand = Math.random().toString(36).slice(2, 8);
  return (`p-${clean || "g"}-${rand}`).slice(0, 64);
}

export function newRowId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
