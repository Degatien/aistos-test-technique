import { DebtorPage } from "./DebtorPage";
import { ImportPage } from "./ImportPage";
import { RemindersPage } from "./RemindersPage";

export function App() {
  const path = window.location.pathname;

  if (path.startsWith("/import")) {
    return <ImportPage />;
  }

  if (path.startsWith("/reminders")) {
    return <RemindersPage />;
  }

  const slug = path.split("/").pop() ?? "";
  return <DebtorPage slug={slug} />;
}