import Link from "next/link";
import { createMealPlanAction } from "@/app/(app)/speiseplan/actions";

const DAY_NAMES = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

function nextWeekdayDate(dayOfWeek: number): string {
  // dayOfWeek: 1=Mo, ..., 7=So
  const today = new Date();
  const todayDow = today.getDay() === 0 ? 7 : today.getDay();
  let diff = dayOfWeek - todayDow;
  if (diff <= 0) diff += 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function NeuenSpeiseplanPage() {
  const defaultDate = nextWeekdayDate(1);

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-6 pt-safe px-safe pb-safe sm:px-6 sm:py-10">
      <header className="mb-8">
        <h1 className="font-hand text-5xl text-ink ink-text">Neuer Speiseplan</h1>
      </header>

      <form action={createMealPlanAction} className="paper-card space-y-6 p-6">
        <label className="block">
          <span className="font-written text-sm text-ink-faded">Name des Plans</span>
          <input
            name="name"
            required
            defaultValue=""
            placeholder="z.B. KW 20"
            className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-written text-xl text-ink outline-none placeholder:text-ink-light"
          />
        </label>

        <label className="block">
          <span className="font-written text-sm text-ink-faded">Erster Wochentag</span>
          <select
            name="firstDay"
            defaultValue="1"
            className="mt-1 block w-full border-b border-dotted border-ink-light bg-transparent font-written text-ink outline-none"
          >
            {DAY_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-written text-sm text-ink-faded">Startdatum</span>
          <input
            name="weekStart"
            type="date"
            defaultValue={defaultDate}
            required
            className="mt-1 block border-b border-dotted border-ink-light bg-transparent font-written text-ink outline-none"
          />
        </label>

        <div className="flex items-center justify-between pt-2">
          <Link
            href="/speiseplan"
            className="font-written text-sm text-ink-faded underline underline-offset-4"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            className="rounded-sm bg-ribbon px-6 py-2 font-hand text-xl text-paper-50 shadow-card"
          >
            Plan anlegen
          </button>
        </div>
      </form>
    </main>
  );
}
