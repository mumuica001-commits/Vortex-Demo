import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { deleteMyAccount, getMyDataExport } from "@/lib/lgpd/fns";

export const Route = createFileRoute("/conta")({ component: Conta });

function Conta() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isPending) return null;
  if (!user) {
    void navigate({ to: "/login" });
    return null;
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await getMyDataExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meus-dados-vortex.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Seus dados foram baixados");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível exportar seus dados");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (confirmText !== "EXCLUIR") return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      toast.success("Conta excluída");
      await signOut("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir sua conta");
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-fg">Minha conta</h1>
        <Link to="/" className="text-sm text-muted underline">
          Voltar
        </Link>
      </div>

      <section className="rounded-3xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
        <h2 className="text-sm font-medium text-fg">Seus dados</h2>
        <p className="mt-1 text-sm text-muted">
          Conforme a LGPD, você pode baixar uma cópia de tudo que guardamos sobre você: perfil,
          amizades e mensagens enviadas/recebidas.
        </p>
        <Button onClick={handleExport} disabled={exporting} className="mt-4">
          {exporting ? "Preparando..." : "Exportar meus dados"}
        </Button>
      </section>

      <section className="rounded-3xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
        <h2 className="text-sm font-medium text-fg">Privacidade</h2>
        <p className="mt-1 text-sm text-muted">
          Leia nossos{" "}
          <Link to="/termos" className="underline">
            Termos de Uso
          </Link>{" "}
          e nossa{" "}
          <Link to="/privacidade" className="underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </section>

      <section className="rounded-3xl border border-red-500/30 bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
        <h2 className="text-sm font-medium text-red-500">Excluir conta</h2>
        <p className="mt-1 text-sm text-muted">
          Isso apaga permanentemente seu perfil, amizades, convites e todas as mensagens. Não pode
          ser desfeito.
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 border-red-500/40 text-red-500"
          >
            Quero excluir minha conta
          </Button>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm text-muted">
              Digite <strong>EXCLUIR</strong> para confirmar:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="EXCLUIR"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleDelete}
                disabled={confirmText !== "EXCLUIR" || deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? "Excluindo..." : "Excluir permanentemente"}
              </Button>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
