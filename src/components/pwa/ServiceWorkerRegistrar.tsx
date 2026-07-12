"use client";

import { useEffect } from "react";

// Guard gegen Reload-Schleifen: `controllerchange` kann theoretisch mehrfach
// feuern (z.B. bei schnell aufeinanderfolgenden SW-Updates). Ohne Flag koennte
// ein `location.reload()` selbst wieder einen `controllerchange` ausloesen und
// die Seite haengt in einer Endlosschleife. Der Flag wird beim naechsten
// frischen Mount (= Reload hat sichtbar geklappt) wieder geloescht.
const RELOAD_FLAG = "kochbuch-sw-reload-pending";

function isEditingText(): boolean {
  const el = document.activeElement;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    try {
      sessionStorage.removeItem(RELOAD_FLAG);
    } catch {
      // sessionStorage kann im privaten Modus/bei Safari-Edge-Faellen werfen —
      // dann eben ohne Loop-Guard weiterlaufen statt die Registrierung abzubrechen.
    }

    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // Reload nach SW-Wechsel: iOS haelt eine Homescreen-PWA fast immer nur im
    // Speicher am Leben (Resume statt echter Navigation) und laedt daher nie
    // von selbst das neue Client-Bundle nach. skipWaiting()+clients.claim() im
    // SW wechseln zwar den Controller, ohne diesen Listener liefe die Seite
    // aber mit altem JS (und toten Server-Action-IDs) einfach weiter.
    const scheduleReload = () => {
      let alreadyPending = false;
      try {
        alreadyPending = sessionStorage.getItem(RELOAD_FLAG) === "1";
      } catch {
        alreadyPending = false;
      }
      if (alreadyPending) return;

      const attempt = () => {
        // Best effort: nicht mitten in einer Texteingabe reloaden, sondern
        // kurz zurueckstellen und erneut pruefen.
        if (isEditingText()) {
          retryTimer = setTimeout(attempt, 3000);
          return;
        }
        try {
          sessionStorage.setItem(RELOAD_FLAG, "1");
        } catch {
          // ignore — im schlimmsten Fall ohne Loop-Guard neu laden
        }
        window.location.reload();
      };
      attempt();
    };

    const onControllerChange = () => scheduleReload();
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // iOS liefert beim Resume aus dem Hintergrund keinen automatischen
    // Update-Check — `visibilitychange` ist dort der verlaesslichste Hook,
    // um `registration.update()` erneut anzustossen.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => reg?.update())
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // updateViaCache: "none" => der Browser prueft /sw.js immer gegen das Netz
    // (nicht den HTTP-Cache). Zusammen mit dem versionierten Cache-Namen zieht
    // die iOS-Homescreen-PWA nach einem Deploy zuegig den neuen Worker und
    // raeumt alte Caches weg — behebt den "Page not found"-Speicherfehler durch
    // veraltete Server-Action-IDs, sofern die laufende Seite danach auch neu
    // laedt (siehe onControllerChange oben).
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch((err) => console.warn("SW registration failed:", err));

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return null;
}
