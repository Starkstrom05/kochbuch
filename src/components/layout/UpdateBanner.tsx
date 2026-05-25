"use client";

import { useEffect, useState } from "react";
import { versionResponseSchema, type VersionResponse } from "@/lib/version/compare";

// Client-seitig getriggert: der eigentliche GitHub-Check + Cache-Refresh
// passiert serverseitig in GET /api/version. Ohne diesen Aufruf wuerde der
// AppMeta-Cache nie befuellt und der Banner nie erscheinen.
export function UpdateBanner() {
  const [data, setData] = useState<VersionResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/version")
      .then((res) => res.json())
      .then((json) => {
        const parsed = versionResponseSchema.safeParse(json);
        if (!cancelled && parsed.success) setData(parsed.data);
      })
      .catch(() => {
        // Offline / GitHub nicht erreichbar: kein Banner, kein Fehler.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data?.hasUpdate) return null;

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
