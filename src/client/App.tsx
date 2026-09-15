import { DebtorPage } from "./DebtorPage";
import { ImportPage } from "./ImportPage";

export function App() {
  const path = window.location.pathname;

  if (path.startsWith("/import")) {
    return <ImportPage />;
  }

  const slug = path.split("/").pop() ?? "";
  return <DebtorPage slug={slug} />;
}