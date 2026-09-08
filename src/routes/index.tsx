import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, MonitorUp, Smartphone, Users, Video } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-mark";
import { FriendsPanel } from "@/components/friends-panel";
import { IncomingCall } from "@/components/incoming-call";
import { InstallPrompt } from "@/components/install-prompt";
import { PrivateChat } from "@/components/private-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { randomCode, normalizeRoomCode } from "@/lib/call/ids";
import { useInbox } from "@/hooks/use-inbox";
import {
  inviteCall,
  requestFriend,
  resolveInvite,
  respondFriend,
  sendMessage,
} from "@/lib/vortex/fns";

export const Route = createFileRoute("/")({ component: Home });

const LAST_READ_KEY = "vortex.lastRead";

function readMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LAST_READ_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function Home() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [roomInput, setRoomInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [lastRead, setLastRead] = useState<Record<string, string>>(readMap);

  const { inbox, refresh } = useInbox({
    enabled: Boolean(user),
    inCall: false,
    chatWith: selected,
    displayName: user?.displayName,
    email: user?.primaryEmail,
  });

  useEffect(() => {
    if (!selected) return;
    setLastRead((prev) => {
      const next = { ...prev, [selected]: new Date().toISOString() };
      localStorage.setItem(LAST_READ_KEY, JSON.stringify(next));
      return next;
    });
  }, [selected, inbox?.chat?.messages.length]);

  const messages = inbox?.chat?.username === selected ? (inbox.chat.messages ?? []) : [];

  function goRoom(code: string) {
    const id = normalizeRoomCode(code);
    if (!id) return;
    void navigate({ to: "/call/$roomId", params: { roomId: id } });
  }

  function createRoom() {
    goRoom(randomCode(6));
  }

  async function callFriend(username: string) {
    const code = randomCode(6);
    try {
      await inviteCall({ data: { username, roomCode: code } });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Não foi possível chamar");
      return;
    }
    goRoom(code);
  }

  async function acceptCall() {
    const ringing = inbox?.ringing;
    if (!ringing) return;
    await resolveInvite({ data: { id: ringing.id, accept: true } }).catch(() => {});
    goRoom(ringing.roomCode);
  }

  async function declineCall() {
    const ringing = inbox?.ringing;
    if (!ringing) return;
    await resolveInvite({ data: { id: ringing.id, accept: false } }).catch(() => {});
    await refresh();
  }

  const signedIn = Boolean(user);
  const username = inbox?.profile?.username;

  const hero = useMemo(
    () => (
      <div className="stagger-in max-w-xl">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-muted uppercase">
          Chamada privada
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl">
          Vídeo nítido.
          <br />
          Amigos na hora.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
          Crie uma sala, chame quem já está na sua lista ou use o celular como webcam do
          computador. Sem plugins.
        </p>
      </div>
    ),
    [],
  );

  return (
    <div className="flex min-h-dvh bg-bg">
      {inbox?.ringing && (
        <IncomingCall
          call={inbox.ringing}
          onAccept={() => void acceptCall()}
          onDecline={() => void declineCall()}
        />
      )}

      {signedIn && (
        <aside className="hidden w-[300px] shrink-0 border-r border-border lg:block">
          <FriendsPanel
            username={username ?? "…"}
            friends={inbox?.friends ?? []}
            incoming={inbox?.incomingRequests ?? []}
            outgoing={inbox?.outgoingRequests ?? []}
            selected={selected}
            lastRead={lastRead}
            onSelect={setSelected}
            onAdd={async (u) => {
              await requestFriend({ data: { username: u } });
              await refresh();
            }}
            onRespond={async (u, accept) => {
              await respondFriend({ data: { username: u, accept } });
              await refresh();
            }}
            onCall={(u) => void callFriend(u)}
          />
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <BrandMark />
          <div className="flex items-center gap-2">
            {signedIn && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setFriendsOpen(true)}
              >
                <Users className="size-4" />
                Amigos
              </Button>
            )}
            <InstallPrompt compact />
            {isPending ? (
              <span className="size-8 animate-pulse rounded-full bg-bg-subtle" />
            ) : signedIn ? (
              <div className="flex items-center gap-3">
                <UserButton />
                <Link to="/conta" className="text-xs text-muted underline">
                  Minha conta
                </Link>
              </div>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">Entrar</Link>
              </Button>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 px-4 pb-10 sm:px-6 lg:flex-row lg:gap-10">
          {selected && signedIn ? (
            <PrivateChat
              friend={selected}
              messages={messages}
              onClose={() => setSelected(null)}
              onSend={(text) => {
                void sendMessage({ data: { username: selected, text } })
                  .then(() => refresh())
                  .catch((err) => toast(err instanceof Error ? err.message : "Falha ao enviar"));
              }}
            />
          ) : (
            <div className="flex flex-1 flex-col justify-center py-6">
              {hero}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="button" size="lg" onClick={createRoom}>
                  <Video className="size-4" />
                  Nova sala
                  <ArrowRight className="size-4" />
                </Button>
                <form
                  className="flex min-w-0 flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    goRoom(roomInput);
                  }}
                >
                  <Input
                    placeholder="Código da sala"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                    className="max-w-[180px] tracking-[0.2em] uppercase"
                    autoCapitalize="characters"
                  />
                  <Button type="submit" variant="secondary" size="lg">
                    Entrar
                  </Button>
                </form>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <Feature
                  icon={<Users className="size-4" />}
                  title="Amigos"
                  body="Adicione pelo @usuario, veja quem está online e ligue com um toque."
                />
                <Feature
                  icon={<MonitorUp className="size-4" />}
                  title="Tela"
                  body="Compartilhe a tela no meio da chamada, sem sair do vídeo."
                />
                <Feature
                  icon={<Smartphone className="size-4" />}
                  title="Celular-webcam"
                  body="Aponte o QR no computador e use a câmera do celular na chamada."
                />
              </div>
            </div>
          )}

          <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[320px]">
            <button
              type="button"
              onClick={() => {
                const code = randomCode(6);
                try {
                  sessionStorage.setItem("vortex.openCam", "1");
                } catch {
                  /* ignore */
                }
                goRoom(code);
              }}
              className="rounded-[28px] bg-bg-elevated p-5 text-left shadow-[var(--shadow-border)] transition-transform duration-150 hover:translate-y-[-1px]"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-bg-subtle">
                <Smartphone className="size-4" />
              </span>
              <p className="mt-3 font-display text-sm font-semibold">Usar o celular como webcam</p>
              <p className="mt-1 text-sm text-muted">
                Abre uma sala com o QR pronto. No telefone, a câmera entra no lugar da webcam.
              </p>
            </button>
            <InstallPrompt />
            {!signedIn && (
              <div className="rounded-[28px] bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
                <p className="font-display text-sm font-semibold">Conta Vortex</p>
                <p className="mt-1 text-sm text-muted">
                  Entre com Google, X ou email para salvar amigos e receber ligações.
                </p>
                <Button asChild className="mt-4 w-full">
                  <Link to="/login">Criar ou entrar</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {friendsOpen && signedIn && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-bg/70"
            aria-label="Fechar amigos"
            onClick={() => setFriendsOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-bg-elevated shadow-[var(--shadow-border)]">
            <FriendsPanel
              username={username ?? "…"}
              friends={inbox?.friends ?? []}
              incoming={inbox?.incomingRequests ?? []}
              outgoing={inbox?.outgoingRequests ?? []}
              selected={selected}
              lastRead={lastRead}
              onSelect={(u) => {
                setSelected(u);
                setFriendsOpen(false);
              }}
              onAdd={async (u) => {
                await requestFriend({ data: { username: u } });
                await refresh();
              }}
              onRespond={async (u, accept) => {
                await respondFriend({ data: { username: u, accept } });
                await refresh();
              }}
              onCall={(u) => {
                setFriendsOpen(false);
                void callFriend(u);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Feature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[24px] bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
      <span className="grid size-9 place-items-center rounded-xl bg-bg-subtle text-fg">{icon}</span>
      <p className="mt-3 font-display text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
