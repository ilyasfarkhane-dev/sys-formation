export async function api(path, options = {}) {
  const response = await fetch("/api" + path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = {
      error: response.ok
        ? "Réponse serveur invalide."
        : "Le serveur n’a pas répondu. Réessayez dans un instant.",
    };
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("session-expired"));
    throw new Error(data.error || "Une erreur est survenue.");
  }
  return data;
}
export const today = () => new Date().toLocaleDateString("en-CA");
export const currentMonth = () => today().slice(0, 7);
export function exportCSV(filename, rows) {
  if (!rows.length) return;
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const csv =
    "\uFEFF" +
    [Object.keys(rows[0]), ...rows.map(Object.values)]
      .map((row) => row.map(cell).join(";"))
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
