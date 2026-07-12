"use client";

import { Caveat, Kalam } from "next/font/google";
import { PaperSheet } from "@/components/oma/PaperSheet";
import "./globals.css";

// global-error.tsx ersetzt bei einem Fehler in RootLayout das komplette
// Dokument (inkl. <html>/<body>) — die Fonts/CSS-Variablen aus layout.tsx
// greifen hier nicht automatisch, deshalb werden sie hier separat geladen.
// Fehlte bislang komplett im src/app-Baum: ohne dieses File zeigt Next.js bei
// einem ungefangenen Fehler (z.B. eine tote Server-Action-ID nach einem
// Deploy, siehe ServiceWorkerRegistrar-Reload-Fix) nur eine generische
// Fehlerseite ohne Selfheal-Option.
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de" className={`${caveat.variable} ${kalam.variable}`}>
      <body className="antialiased">
        <main className="pt-safe pb-safe px-safe mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10 text-center">
          <PaperSheet withInkblots={false} className="w-full p-8 sm:p-10">
            <p className="font-hand text-ink ink-text text-6xl">🫠</p>
            <h1 className="font-hand text-ink ink-text mt-4 text-4xl">
              Da ist etwas schiefgelaufen
            </h1>
            <p className="font-written text-ink-faded mt-3 text-lg">
              Meist hilft ein Neuladen — besonders nach einem frischen Update laeuft manchmal noch
              ein alter Stand im Hintergrund.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-5 py-2 text-xl"
              >
                App neu laden
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  window.location.href = "/rezepte";
                }}
                className="font-written text-ribbon text-sm underline underline-offset-4"
              >
                Zu den Rezepten
              </button>
            </div>
          </PaperSheet>
        </main>
      </body>
    </html>
  );
}
