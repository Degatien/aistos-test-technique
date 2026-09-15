import { useRef, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";

interface ImportResponse {
  debtsCreated?: number;
  uniqueDebtors?: number;
  error?: string;
}

export function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);

    if (selected && !selected.name.toLowerCase().endsWith(".csv")) {
      setResult({ error: "Le fichier doit être au format CSV (.csv)." });
    }
  }

  async function onUpload() {
    if (!file) {
      setResult({ error: "Veuillez sélectionner un fichier CSV." });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setResult({ error: "Le fichier doit être au format CSV (.csv)." });
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: file,
      });
      const data = (await res.json()) as ImportResponse;
      if (!res.ok && !data.error) {
        setResult({ error: "Erreur serveur pendant l'import." });
      } else {
        setResult(data);
      }
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
              Colonnes attendues :{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                name,email,debtSubject,debtAmount
              </code>
            </p>

            <input
              ref={inputRef}
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={busy}
              onChange={onSelect}
            />

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                <FileText />
                Choisir un fichier
              </Button>

              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {file ? file.name : "Aucun fichier sélectionné"}
              </span>

              <Button onClick={onUpload} disabled={busy || !file} className="shrink-0">
                <Upload />
                Importer
              </Button>
            </div>

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