import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="font-hand text-7xl text-ink ink-text">Omas Kochbuch</h1>
      <p className="mt-4 font-written text-xl text-ink-faded">
        Familien-Rezepte, liebevoll handgeschrieben
      </p>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/rezepte"
          className="paper-card px-6 py-3 font-hand text-2xl text-ink transition hover:rotate-1"
        >
          Zum Rezeptbuch
        </Link>
        <Link
          href="/login"
          className="font-written text-lg text-ribbon underline decoration-wavy underline-offset-4"
        >
          Anmelden
        </Link>
      </div>

      <footer className="mt-16 font-written text-sm text-ink-light">
        Version 0.1.0 &middot; selbstgehostet mit Liebe
      </footer>
    </main>
  );
}
