import { getVersionStatus } from "@/lib/version/check";

/**
 * Update-Banner als Server-Component: `getVersionStatus()` laeuft direkt im
 * App-Layout-Render, statt einen Client-Roundtrip zu `/api/version` zu starten.
 * Spart `next-auth/react`-unabhaengig den ganzen Fetch-Boilerplate aus dem
 * Initial-Client-Bundle und vermeidet das Layout-Shift, das der Client-Fetch
 * frueher beim Erscheinen verursacht hat.
 *
 * Caching liegt weiterhin in AppMeta (24 h), siehe getVersionStatus().
 */
export async function UpdateBanner() {
  const data = await getVersionStatus();
  if (!data.hasUpdate) return null;

  return (
    <div className="bg-paper-200 font-written text-ink ring-paper-300 px-4 py-2 text-center text-sm ring-1">
      🆕 Version <strong className="font-semibold">{data.latest}</strong> ist verfügbar (aktuell:{" "}
      {data.current}).{" "}
      <a
        href="https://github.com/Starkstrom05/kochbuch/releases/latest"
        target="_blank"
        rel="noreferrer"
        className="text-ribbon underline underline-offset-2"
      >
        Update-Anleitung →
      </a>
    </div>
  );
}
