import { trpc } from "./trpc";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";

function getPaymentParam(): string | null {
  return new URLSearchParams(window.location.search).get("payment");
}

async function pay(debtId: string) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ debtId }),
  });

  const data = (await res.json()) as { url?: string; error?: string };

  if (!res.ok || !data.url) {
    alert(data.error ?? "Une erreur est survenue.");
    return;
  }

  window.location.href = data.url;
}

export function DebtorPage({ slug }: { slug: string }) {
  const payment = getPaymentParam();
  const { data, isLoading, error } = trpc.debtor.getBySlug.useQuery({ slug });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-600">Erreur : {error.message}</div>;
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Débiteur introuvable.</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-lg space-y-6">
        {payment === "success" && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Merci ! Votre paiement a bien été pris en compte.
          </div>
        )}
        {payment === "cancelled" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Paiement annulé. Vous pouvez réessayer quand vous voulez.
          </div>
        )}

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-muted-foreground">{data.email}</p>
        </div>

        <div className="space-y-4">
          {data.debts.map((debt) => (
            <Card key={debt.id}>
              <CardHeader>
                <CardTitle>{debt.debtSubject}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-2xl font-semibold">{debt.debtAmount.toLocaleString("fr-FR")} €</p>
                  <p className="text-sm text-muted-foreground">
                    Statut : {debt.status === "PAID" ? "Payée" : "En attente"}
                  </p>
                </div>
                <Button
                  disabled={debt.status === "PAID"}
                  onClick={() => pay(debt.id)}
                >
                  {debt.status === "PAID" ? "Payée" : "Payer"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}