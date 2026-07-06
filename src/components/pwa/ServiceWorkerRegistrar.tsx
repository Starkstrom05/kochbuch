"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // updateViaCache: "none" => der Browser prueft /sw.js immer gegen das Netz
    // (nicht den HTTP-Cache). Zusammen mit dem versionierten Cache-Namen zieht
    // die iOS-Homescreen-PWA nach einem Deploy zuegig den neuen Worker und
    // raeumt alte Caches weg — behebt den "Page not found"-Speicherfehler durch
    // veraltete Server-Action-IDs.
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch((err) => console.warn("SW registration failed:", err));
  }, []);

  return null;
}
