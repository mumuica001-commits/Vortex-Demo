import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { newRowId } from "@/lib/call/ids";
import type { ChatMessage, FriendRow, Inbox, IncomingRequest, Profile } from "./types";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const PRESENCE_ONLINE_SECONDS = 45;
const INVITE_TTL_SECONDS = 45;

function slugFrom(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
  return cleaned.length >= 3 ? cleaned : "user";
}

async function ensureProfile(
  userId: string,
  hintName: string | null,
  hintEmail: string | null,
): Promise<Profile> {
  const sql = await getSql();
  const existing = await sql.query<Profile>(
    `select user_id as "userId", username, display_name as "displayName" from profiles where user_id = $1`,
    [userId],
  );
  if (existing[0]) return existing[0];

  const base = slugFrom(hintName || hintEmail?.split("@")[0] || "user");
  const displayName = (hintName || hintEmail || "Vortex").slice(0, 40);
  for (let i = 0; i < 12; i++) {
    const username = i === 0 ? base : `${base}${i + 1}`.slice(0, 20);
    try {
      await sql.query(
        `insert into profiles (user_id, username, display_name) values ($1, $2, $3)`,
        [userId, username, displayName],
      );
      return { userId, username, displayName };
    } catch {
      /* unique collision — try next */
    }
  }
  const fallback = `u${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}`;
  await sql.query(
    `insert into profiles (user_id, username, display_name) values ($1, $2, $3)
     on conflict (user_id) do nothing`,
    [userId, fallback.slice(0, 20), displayName],
  );
  const again = await sql.query<Profile>(
    `select user_id as "userId", username, display_name as "displayName" from profiles where user_id = $1`,
    [userId],
  );
  if (!again[0]) throw new Error("Não foi possível criar o perfil");
  return again[0];
}

export const syncInbox = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      inCall: z.boolean().optional(),
      chatWith: z.string().max(20).optional(),
      displayName: z.string().max(40).optional(),
      email: z.string().max(120).optional(),
    }),
  )
  .handler(async ({ context, data }): Promise<Inbox> => {
    const sql = await getSql();
    const profile = await ensureProfile(
      context.userId,
      data.displayName ?? null,
      data.email ?? null,
    );

    await sql.query(
      `insert into presence (user_id, last_seen, in_call)
       values ($1, now(), $2)
       on conflict (user_id) do update set last_seen = now(), in_call = $2`,
      [context.userId, data.inCall ?? false],
    );

    await sql.query(
      `update call_invites set status = 'expired'
       where to_user_id = $1 and status = 'ringing'
         and created_at < now() - make_interval(secs => $2)`,
      [context.userId, INVITE_TTL_SECONDS],
    );

    const friends = await sql.query<{
      userId: string;
      username: string;
      displayName: string;
      lastSeen: string | null;
      inCall: boolean | null;
      lastMessageAt: string | null;
    }>(
      `select p.user_id as "userId", p.username, p.display_name as "displayName",
              pr.last_seen as "lastSeen", coalesce(pr.in_call, false) as "inCall",
              (
                select max(m.created_at) from messages m
                where (m.sender_id = p.user_id and m.receiver_id = $1)
                   or (m.sender_id = $1 and m.receiver_id = p.user_id)
              ) as "lastMessageAt"
       from friendships f
       join profiles p on p.user_id = case
         when f.requester_id = $1 then f.addressee_id else f.requester_id end
       left join presence pr on pr.user_id = p.user_id
       where (f.requester_id = $1 or f.addressee_id = $1) and f.status = 'accepted'
       order by p.username`,
      [context.userId],
    );

    const friendRows: FriendRow[] = friends.map((f) => {
      const last = f.lastSeen ? new Date(f.lastSeen).getTime() : 0;
      const online = Date.now() - last < PRESENCE_ONLINE_SECONDS * 1000;
      return {
        userId: f.userId,
        username: f.username,
        displayName: f.displayName,
        online,
        inCall: Boolean(f.inCall) && online,
        lastMessageAt: f.lastMessageAt,
      };
    });

    const incoming = await sql.query<IncomingRequest>(
      `select p.username, p.display_name as "displayName"
       from friendships f join profiles p on p.user_id = f.requester_id
       where f.addressee_id = $1 and f.status = 'pending'`,
      [context.userId],
    );
    const outgoing = await sql.query<{ username: string }>(
      `select p.username
       from friendships f join profiles p on p.user_id = f.addressee_id
       where f.requester_id = $1 and f.status = 'pending'`,
      [context.userId],
    );

    const ringingRows = await sql.query<{
      id: string;
      fromUsername: string;
      fromDisplayName: string;
      roomCode: string;
      createdAt: string;
    }>(
      `select i.id, p.username as "fromUsername", p.display_name as "fromDisplayName",
              i.room_code as "roomCode", i.created_at as "createdAt"
       from call_invites i join profiles p on p.user_id = i.from_user_id
       where i.to_user_id = $1 and i.status = 'ringing'
       order by i.created_at desc limit 1`,
      [context.userId],
    );

    let chat: Inbox["chat"] = null;
    if (data.chatWith) {
      const other = await sql.query<{ user_id: string }>(
        `select user_id from profiles where lower(username) = lower($1)`,
        [data.chatWith],
      );
      if (other[0]) {
        const messages = await sql.query<ChatMessage>(
          `select id,
                  (sender_id = $1) as "fromMe",
                  content as text,
                  created_at as time
           from messages
           where (sender_id = $1 and receiver_id = $2)
              or (sender_id = $2 and receiver_id = $1)
           order by created_at asc
           limit 300`,
          [context.userId, other[0].user_id],
        );
        chat = { username: data.chatWith, messages };
      }
    }

    return {
      profile,
      friends: friendRows,
      incomingRequests: incoming,
      outgoingRequests: outgoing.map((r) => r.username),
      ringing: ringingRows[0] ?? null,
      chat,
    };
  });

export const claimUsername = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ username: z.string().min(3).max(20) }))
  .handler(async ({ context, data }) => {
    const username = data.username.trim();
    if (!USERNAME_RE.test(username)) {
      throw new Error("Use 3–20 caracteres: letras, números ou _");
    }
    const sql = await getSql();
    const taken = await sql.query<{ user_id: string }>(
      `select user_id from profiles where lower(username) = lower($1) and user_id <> $2`,
      [username, context.userId],
    );
    if (taken[0]) throw new Error("Esse usuário já está em uso");
    await sql.query(
      `insert into profiles (user_id, username, display_name)
       values ($1, $2, $2)
       on conflict (user_id) do update set username = excluded.username`,
      [context.userId, username],
    );
    return { username };
  });

export const requestFriend = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ username: z.string().min(1).max(20) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const target = await sql.query<{ user_id: string; username: string }>(
      `select user_id, username from profiles where lower(username) = lower($1)`,
      [data.username.trim()],
    );
    if (!target[0]) throw new Error("Usuário não encontrado");
    if (target[0].user_id === context.userId) {
      throw new Error("Você não pode adicionar a si mesmo");
    }
    const existing = await sql.query<{ status: string }>(
      `select status from friendships
       where (requester_id = $1 and addressee_id = $2)
          or (requester_id = $2 and addressee_id = $1)`,
      [context.userId, target[0].user_id],
    );
    if (existing[0]) {
      throw new Error(
        existing[0].status === "accepted" ? "Vocês já são amigos" : "Já existe um pedido pendente",
      );
    }
    await sql.query(
      `insert into friendships (id, requester_id, addressee_id, status)
       values ($1, $2, $3, 'pending')`,
      [newRowId(), context.userId, target[0].user_id],
    );
    return { ok: true as const };
  });

export const respondFriend = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ username: z.string().min(1).max(20), accept: z.boolean() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const requester = await sql.query<{ user_id: string }>(
      `select user_id from profiles where lower(username) = lower($1)`,
      [data.username],
    );
    if (!requester[0]) throw new Error("Usuário não encontrado");
    const pending = await sql.query<{ id: string }>(
      `select id from friendships
       where requester_id = $1 and addressee_id = $2 and status = 'pending'`,
      [requester[0].user_id, context.userId],
    );
    if (!pending[0]) throw new Error("Pedido não encontrado");
    if (data.accept) {
      await sql.query(`update friendships set status = 'accepted' where id = $1`, [pending[0].id]);
    } else {
      await sql.query(`delete from friendships where id = $1`, [pending[0].id]);
    }
    return { ok: true as const };
  });

export const removeFriend = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ username: z.string().min(1).max(20) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const other = await sql.query<{ user_id: string }>(
      `select user_id from profiles where lower(username) = lower($1)`,
      [data.username],
    );
    if (!other[0]) return { ok: true as const };
    await sql.query(
      `delete from friendships
       where (requester_id = $1 and addressee_id = $2)
          or (requester_id = $2 and addressee_id = $1)`,
      [context.userId, other[0].user_id],
    );
    return { ok: true as const };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ username: z.string().min(1).max(20), text: z.string().min(1).max(2000) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const other = await sql.query<{ user_id: string }>(
      `select user_id from profiles where lower(username) = lower($1)`,
      [data.username],
    );
    if (!other[0]) throw new Error("Usuário não encontrado");
    const friendship = await sql.query<{ id: string }>(
      `select id from friendships
       where status = 'accepted'
         and ((requester_id = $1 and addressee_id = $2)
           or (requester_id = $2 and addressee_id = $1))`,
      [context.userId, other[0].user_id],
    );
    if (!friendship[0]) throw new Error("Vocês não são amigos");
    const text = data.text.trim();
    if (!text) throw new Error("Mensagem vazia");
    const inserted = await sql.query<{ id: number; created_at: string }>(
      `insert into messages (sender_id, receiver_id, content)
       values ($1, $2, $3) returning id, created_at`,
      [context.userId, other[0].user_id, text],
    );
    return {
      id: inserted[0]!.id,
      fromMe: true as const,
      text,
      time: inserted[0]!.created_at,
    };
  });

export const inviteCall = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ username: z.string().min(1).max(20), roomCode: z.string().min(4).max(8) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const other = await sql.query<{ user_id: string }>(
      `select user_id from profiles where lower(username) = lower($1)`,
      [data.username],
    );
    if (!other[0]) throw new Error("Usuário não encontrado");
    await sql.query(
      `update call_invites set status = 'expired'
       where from_user_id = $1 and to_user_id = $2 and status = 'ringing'`,
      [context.userId, other[0].user_id],
    );
    await sql.query(
      `insert into call_invites (id, from_user_id, to_user_id, room_code, status)
       values ($1, $2, $3, $4, 'ringing')`,
      [newRowId(), context.userId, other[0].user_id, data.roomCode.toUpperCase()],
    );
    return { ok: true as const };
  });

export const resolveInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().min(1), accept: z.boolean() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql.query(
      `update call_invites set status = $3
       where id = $1 and to_user_id = $2 and status = 'ringing'`,
      [data.id, context.userId, data.accept ? "accepted" : "declined"],
    );
    return { ok: true as const };
  });
