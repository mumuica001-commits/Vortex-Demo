/**
 * Funções LGPD: consentimento, exportação de dados (Art. 18 V) e exclusão de
 * conta (Art. 18 VI — direito ao esquecimento). Server-only.
 */
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export const acceptTerms = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql.query(`update "user" set "termsAcceptedAt" = now() where id = $1`, [
      context.userId,
    ]);
    return { ok: true as const };
  });

export const getMyDataExport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const userId = context.userId;

    const [account] = await sql.query<{
      id: string;
      name: string;
      email: string;
      createdAt: string;
      termsAcceptedAt: string | null;
    }>(
      `select id, name, email, "createdAt", "termsAcceptedAt" from "user" where id = $1`,
      [userId],
    );

    const [profile] = await sql.query<{
      username: string;
      displayName: string;
      createdAt: string;
    }>(
      `select username, display_name as "displayName", created_at as "createdAt"
       from profiles where user_id = $1`,
      [userId],
    );

    const friends = await sql.query<{ otherUserId: string; status: string; createdAt: string }>(
      `select
         case when requester_id = $1 then addressee_id else requester_id end as "otherUserId",
         status, created_at as "createdAt"
       from friendships where requester_id = $1 or addressee_id = $1`,
      [userId],
    );

    const messagesSent = await sql.query<{
      receiverId: string;
      content: string;
      createdAt: string;
    }>(
      `select receiver_id as "receiverId", content, created_at as "createdAt"
       from messages where sender_id = $1 order by created_at asc`,
      [userId],
    );

    const messagesReceived = await sql.query<{
      senderId: string;
      content: string;
      createdAt: string;
    }>(
      `select sender_id as "senderId", content, created_at as "createdAt"
       from messages where receiver_id = $1 order by created_at asc`,
      [userId],
    );

    return {
      exportedAt: new Date().toISOString(),
      account: account ?? null,
      profile: profile ?? null,
      friendships: friends,
      messagesSent,
      messagesReceived,
    };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const userId = context.userId;

    // Apaga primeiro os dados próprios do app (sem FK/cascade pra "user").
    await sql.query(`delete from messages where sender_id = $1 or receiver_id = $1`, [userId]);
    await sql.query(`delete from friendships where requester_id = $1 or addressee_id = $1`, [
      userId,
    ]);
    await sql.query(`delete from call_invites where from_user_id = $1 or to_user_id = $1`, [
      userId,
    ]);
    await sql.query(`delete from presence where user_id = $1`, [userId]);
    await sql.query(`delete from profiles where user_id = $1`, [userId]);

    // Por último, a conta em si — cascade apaga "session" e "account" do
    // Better Auth automaticamente (FK ON DELETE CASCADE em 0001_auth.sql).
    await sql.query(`delete from "user" where id = $1`, [userId]);

    return { ok: true as const };
  });
