import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

type Section = {
  id: string;
  title: string;
  intro?: string;
  steps: string[];
  tip?: string;
};

const SECTIONS: Section[] = [
  {
    id: "rezept-anlegen",
    title: "Ein Rezept anlegen",
    intro: "Vier Wege, ein Rezept ins Kochbuch zu bekommen.",
    steps: [
      "Manuell: »+ Neu« in der Rezeptliste → Titel, Zutaten, Schritte tippen.",
      "Aus dem Web: »Importieren« → URL einfügen. Das Kochbuch versucht zuerst, die Daten direkt zu lesen; klappt das nicht, fällt es auf das lokale KI-Modell zurück (falls eingerichtet).",
      "Foto (OCR): »Importieren« → »Foto« → Bild eines gedruckten Rezepts hochladen. Der Text wird ausgelesen, du musst nur noch korrigieren.",
      "Handschrift: Auf einem iPad mit Apple Pencil kannst du im Editor direkt aufs Rezept-Papier schreiben.",
    ],
    tip: "Bilder werden serverseitig in Sepia umgewandelt — das ist Absicht, gehört zum Oma-Design.",
  },
  {
    id: "mengen",
    title: "Mengen skalieren",
    steps: [
      "Im Rezept-Detail rechts oben den Portionen-Stepper benutzen (z.B. von 4 auf 6 Personen).",
      "Alle Zutaten und Nährwerte rechnen sich live um.",
      "Die Wahl bleibt für dieses Rezept gespeichert; ein Link mit `?servings=6` lässt sich auch teilen.",
    ],
  },
  {
    id: "suche",
    title: "Rezepte finden",
    steps: [
      "Suchfeld oben in der Liste — durchsucht Titel, Beschreibung und Zutaten.",
      "Kategorien-Filter rechts daneben.",
      "Drei Ansichten umschaltbar: Karten / Fotos / Liste — jede behält Suche und Filter.",
    ],
  },
  {
    id: "speiseplan",
    title: "Speiseplan",
    intro: "Wochenplan mit Mahlzeiten pro Tag.",
    steps: [
      "»Speiseplan« → »+ Neu«, Wochenanfang wählen.",
      "Pro Tag und Mahlzeit ein Rezept zuweisen, Portionen anpassen.",
      "Optional als familien-geteilt markieren — dann sehen alle in deiner Familie denselben Plan.",
      "Aus dem Plan eine Einkaufsliste erzeugen (»Zur Einkaufsliste«). Mengen werden anhand der Portionen skaliert.",
    ],
    tip: "Den Plan kannst du als PDF in DIN-A4-Querformat drucken.",
  },
  {
    id: "einkaufsliste",
    title: "Einkaufsliste",
    steps: [
      "Aus einem Rezept: »Zur Einkaufsliste hinzufügen« — Mengen werden auf die gewählte Portionszahl skaliert.",
      "Aus dem Speiseplan: gleiches Prinzip, aber für mehrere Rezepte gleichzeitig.",
      "Manuell: »+ Manuell« unten in der Liste.",
      "Abhaken einzeln (Kreuz) oder gruppenweise (Hauptzeile). Erledigte rutschen nach unten.",
      "Teilen-Knopf bietet drei Formate: Klartext (Web Share / Clipboard / Fallback), Push zu OurGroceries (siehe unten) oder CSV-Download.",
    ],
  },
  {
    id: "ourgroceries",
    title: "OurGroceries-Brücke",
    intro: "Optionale Direkt-Übertragung in die OurGroceries-App.",
    steps: [
      "Profil → »OurGroceries-Brücke« → E-Mail und Passwort deines OG-Kontos eintragen.",
      "Standard-Liste wählen, in die die Items wandern sollen.",
      "Auf der Einkaufsliste »Teilen« → »→ OurGroceries« klicken.",
      "Klappt die Übertragung nicht (z.B. OurGroceries gerade nicht erreichbar), bietet die App den CSV-Download als Fallback an.",
    ],
    tip: "Wichtig: dabei werden Item-Namen, Mengen und Rezept-Quellen an ourgroceries.com (USA) übertragen. Sonst bleibt alles lokal auf dem NAS.",
  },
  {
    id: "vorrat",
    title: "Vorrat",
    steps: [
      "»Vorrat« → Zutaten eintragen, die du Zuhause hast.",
      "Auf der Rezept-Liste siehst du dann, welche Rezepte du komplett (oder fast) kochen kannst.",
      "»Fehlende Zutaten zur Einkaufsliste« legt direkt eine Einkaufsliste an.",
    ],
  },
  {
    id: "kochen",
    title: "Kochen mit Timer-Modus",
    steps: [
      "Im Rezept-Detail »Kochen« — Vollbildansicht mit großen Schritten.",
      "Hat ein Schritt eine Dauer hinterlegt, startet ein Timer mit Alarm.",
      "Der Bildschirm bleibt an, solange du im Modus bist (Wake-Lock).",
    ],
  },
  {
    id: "buch",
    title: "Buch-Modus",
    intro: "Zwei-Seiten-Ansicht zum Blättern auf dem Tablet.",
    steps: [
      "Rezeptliste → »Buch« — alle Rezepte als blätterbares Buch.",
      "Sound beim Umblättern lässt sich im Profil deaktivieren.",
    ],
  },
  {
    id: "teilen",
    title: "Ein Rezept teilen",
    steps: [
      "Im Rezept-Detail »Teilen« → erzeugt einen Public-Link mit eigenem Token.",
      "Der Link funktioniert ohne Login, ist aber nur für Personen, die ihn kennen.",
      "Token-Link wieder deaktivieren: gleiche Stelle, »Public-Link entfernen«.",
    ],
  },
  {
    id: "familie",
    title: "Familien und Sichtbarkeit",
    intro:
      "Mehrere Familien können dasselbe Kochbuch nutzen, sehen sich aber nur Teile gegenseitig.",
    steps: [
      "Jedes Rezept hat eine Sichtbarkeit: »privat« (nur du), »Familie« (deine Familie), »geteilt« (alle Familien sehen es).",
      "Kategorien und Speisepläne können familien-spezifisch oder geteilt sein.",
      "Familien-Branding (Name, Farben) wird im Profil von einem Admin gepflegt.",
    ],
  },
  {
    id: "update",
    title: "Updates",
    steps: [
      'Erscheint oben ein Banner „Version X verfügbar", liegt ein neues Image auf GHCR.',
      "Update wird vom Admin auf dem NAS angestoßen (manuelles `docker pull` oder Watchtower).",
      "Nach dem Update öffnet sich automatisch ein »Was ist neu?«-Drawer mit den Release-Notes.",
      "Im Profil unter »Was ist neu?« kannst du die Notes jederzeit nochmal aufrufen.",
    ],
  },
];

export default async function HilfePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="pt-safe px-safe pb-safe mx-auto max-w-2xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-8">
        <Link
          href="/profil"
          className="font-written text-ribbon text-sm underline underline-offset-4"
        >
          ← Profil
        </Link>
        <h1 className="font-hand text-ink ink-text mt-2 text-6xl">Hilfe</h1>
        <p className="font-written text-ink-faded">
          Kurzanleitungen für alle Funktionen — gedacht zum Vor- und Zurückspringen.
        </p>
      </header>

      <nav aria-label="Inhalt" className="paper-card mb-8 p-6">
        <h2 className="font-hand text-ink mb-2 text-2xl">Inhalt</h2>
        <ul className="font-written grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-ribbon hover:text-ribbon underline underline-offset-2"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="paper-card scroll-mt-6 p-6">
            <h2 className="font-hand text-ink text-3xl">{section.title}</h2>
            {section.intro ? (
              <p className="font-written text-ink-faded mt-2 text-sm">{section.intro}</p>
            ) : null}
            <ol className="font-written text-ink mt-3 list-decimal space-y-2 pl-5 text-sm">
              {section.steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
            {section.tip ? (
              <p className="bg-paper-200 font-written text-ink ring-paper-300 mt-4 rounded-sm px-3 py-2 text-sm ring-1">
                <strong className="text-ribbon">Tipp:</strong> {section.tip}
              </p>
            ) : null}
          </section>
        ))}
      </div>

      <footer className="font-written text-ink-faded mt-10 text-xs">
        Fragen, die hier nicht stehen? Sprich Jonas an — oder schau ins{" "}
        <a
          href="https://github.com/Starkstrom05/kochbuch"
          target="_blank"
          rel="noreferrer"
          className="text-ribbon underline underline-offset-2"
        >
          GitHub-Repo
        </a>
        .
      </footer>
    </main>
  );
}
