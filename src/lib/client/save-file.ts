/**
 * Datei vom Server holen und auf der jeweils besten Art für das Gerät anbieten.
 *
 * Hintergrund: iOS Safari ignoriert das `download`-Attribut von `<a>` komplett —
 * es öffnet PDF/CSV im Viewer und „lädt" ZIP gar nicht. Der einzige native Weg,
 * eine Datei auf iOS zu speichern, ist das Share-Sheet („In Dateien sichern").
 *
 * Strategie (Fallback-Kette):
 *  1. Web Share mit Datei (`navigator.share({ files })`) — iOS Safari / Android
 *     Chrome, nur im Secure Context (HTTPS/Tailscale). Öffnet das native Share-
 *     Sheet → „In Dateien sichern" / direkt teilen.
 *  2. Klassischer Blob-Download (`<a download>`) — Desktop-Browser.
 *  3. Im neuen Tab öffnen — letzter Ausweg (iOS ohne HTTPS): zeigt den Viewer,
 *     von dem aus der native Teilen-Button speichern kann.
 *
 * Gibt zurück, welcher Pfad genutzt wurde — für optionale UI-Hinweise.
 */
export type SaveResult = "shared" | "downloaded" | "opened" | "cancelled";

export async function saveOrShareFile(url: string, filename: string): Promise<SaveResult> {
  let blob: Blob;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      window.open(url, "_blank", "noopener");
      return "opened";
    }
    blob = await res.blob();
  } catch {
    window.open(url, "_blank", "noopener");
    return "opened";
  }

  const type = blob.type || "application/octet-stream";
  const file = new File([blob], filename, { type });

  // 1) Web Share mit Datei (mobil, Secure Context).
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (err) {
      // Vom Nutzer abgebrochen → nicht weiter aufdrängen.
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // Sonst (z. B. verlorene User-Geste bei langsamer Generierung): weiter zum Fallback.
    }
  }

  // 2) Klassischer Download via Blob-URL (Desktop; auf iOS ignoriert Safari `download`).
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return "downloaded";
  } finally {
    // Verzögert freigeben, damit der Download-Vorgang die URL noch lesen kann.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  }
}
