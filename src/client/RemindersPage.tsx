import { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";

interface PendingDebt {
  id: string;
  debtSubject: string;
  debtAmount: number;
}

interface PendingDebtor {
  id: string;
  slug: string;
  name: string;
  email: string;
  pendingDebts: PendingDebt[];
}

export function RemindersPage() {
  const [debtors, setDebtors] = useState<PendingDebtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/reminders");
      const data = (await res.json()) as { debtors: PendingDebtor[] };
      setDebtors(data.debtors);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function sendTo(id: string) {
    setBusyId(id);
    setNotice(null);
    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debtorIds: [id] }),
      });
      const data = (await res.json()) as { sent?: number; error?: string };
      setNotice(res.ok ? `Email envoyé (${data.sent}).` : data.error ?? "Erreur.");
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function sendAll() {
    setSendingAll(true);
    setNotice(null);
    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { sent?: number; error?: string };
      setNotice(res.ok ? `${data.sent} email(s) envoyé(s).` : data.error ?? "Erreur.");
      await refresh();
    } finally {
      setSendingAll(false);
    }
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Relances</h1>
          <Button onClick={sendAll} disabled={sendingAll || debtors.length === 0}>
            {sendingAll ? "Envoi…" : `Tout envoyer (${debtors.length})`}
          </Button>
        </div>

        {notice && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {notice}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : debtors.length === 0 ? (
          <p className="text-muted-foreground">Aucun débiteur avec une dette en attente.</p>
        ) : (
          <div className="space-y-4">
            {debtors.map((debtor) => (
              <Card key={debtor.id}>
                <CardHeader>
                  <CardTitle>
                    {debtor.name}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">{debtor.email}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <ul className="space-y-1 text-sm">
                    {debtor.pendingDebts.map((debt) => (
                      <li key={debt.id}>
                        {debt.debtSubject} — {debt.debtAmount.toLocaleString("fr-FR")} €
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    disabled={busyId === debtor.id}
                    onClick={() => sendTo(debtor.id)}
                  >
                    {busyId === debtor.id ? "Envoi…" : "Envoyer un mail"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}