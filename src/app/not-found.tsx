"use client";

import Link from "next/link";
import { PaperSheet } from "@/components/oma/PaperSheet";

// Fehlt bislang komplett im src/app-Baum. Faengt u.a. den iPhone-"Page not
// found"-Fall ab, wenn eine veraltete Server-Action-ID (altes Client-Bundle
// einer im Hintergrund fortlebenden Homescreen-PWA) auf eine 404-Route trifft
// — statt eines nackten Next.js-Fehlers gibt es hier einen 1-Klick-Selfheal.
export default function NotFound() {
  return (
    <main className="pt-safe pb-safe px-safe mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10 text-center">
      <PaperSheet seed="not-found" className="w-full p-8 sm:p-10">
        <p className="font-hand text-ink ink-text text-6xl">🔍</p>
        <h1 className="font-hand text-ink ink-text mt-4 text-4xl">Seite nicht gefunden</h1>
        <p className="font-written text-ink-faded mt-3 text-lg">
          Diese Seite gibt es nicht (mehr) — oder dein Kochbuch laeuft nach einem Update noch mit
          einem alten Stand. Ein Neuladen hilft meistens.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-5 py-2 text-xl"
          >
            App neu laden
          </button>
          <Link
            href="/rezepte"
            className="font-written text-ribbon text-sm underline underline-offset-4"
          >
            Zu den Rezepten
          </Link>
        </div>
      </PaperSheet>
    </main>
  );
}
