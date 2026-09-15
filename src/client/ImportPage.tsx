import { useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";

interface ImportResponse {
  debtsCreated?: number;
  uniqueDebtors?: number;
  error?: string;
}

export function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  async function onUpload(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: file,
      });
      setResult((await res.json()) as ImportResponse);
    } catch {
      setResult({ error: "Impossible d'envoyer le fichier." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Importer un CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Colonnes attendues : <code className="rounded bg-muted px-1">name,email,debtSubject,debtAmount</code>
            </p>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:text-primary-foreground"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
            />

            {busy && <p className="text-sm text-muted-foreground">Import en cours…</p>}

            {result && !result.error && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                Import réussi : {result.debtsCreated} dette(s) créée(s) pour{" "}
                {result.uniqueDebtors} débiteur(s).
              </div>
            )}
            {result?.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {result.error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}