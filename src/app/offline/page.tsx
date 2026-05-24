import Link from "next/link";
import { PaperSheet } from "@/components/oma/PaperSheet";

export const metadata = { title: "Offline" };

// Statische Fallback-Seite, die der Service Worker precached und bei
// fehlgeschlagener Navigation ohne Cache ausliefert.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10 pt-safe pb-safe px-safe text-center">
      <PaperSheet seed="offline" className="w-full p-8 sm:p-10">
        <p className="font-hand text-6xl text-ink ink-text">🍲</p>
        <h1 className="mt-4 font-hand text-4xl text-ink ink-text">Gerade offline</h1>
        <p className="mt-3 font-written text-lg text-ink-faded">
          Keine Verbindung. Schon geöffnete Rezepte und ihre Bilder sind oft trotzdem
          da — sonst geht es weiter, sobald du wieder online bist.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/rezepte"
            className="rounded-sm bg-ribbon px-5 py-2 font-hand text-xl text-paper-50 shadow-card"
          >
            Zu den Rezepten
          </Link>
          <Link href="/" className="font-written text-sm text-ribbon underline underline-offset-4">
            Startseite
          </Link>
        </div>
      </PaperSheet>
    </main>
  );
}
