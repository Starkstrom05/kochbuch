"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PaperSheet } from "@/components/oma/PaperSheet";
import { formatDuration } from "@/lib/recipes/steps";
import { playTimerAlert, primeTimerAudio } from "@/lib/sound/timer";

type Step = { text: string; durationSeconds: number | null };

type RunningTimer = {
  id: number;
  label: string;
  endsAt: number; // epoch ms
  total: number; // seconds
  done: boolean;
};

const PRESETS_MIN = [1, 3, 5, 10];

export function CookMode({
  recipe,
  steps,
}: {
  recipe: { title: string; slug: string };
  steps: Step[];
}) {
  const total = steps.length;
  const [current, setCurrent] = useState(0);
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useState(false);
  const [flash, setFlash] = useState(false);
  const [customMin, setCustomMin] = useState("");
  const nextId = useRef(1);

  const step: Step | undefined = steps[current];
  const hasActiveTimers = timers.some((t) => !t.done);

  // Single ticking interval: updates the clock and fires the alert when a timer
  // crosses zero. setState lives in the timer callback (not the effect body), and
  // the effect re-subscribes whenever timers/muted change so the closure is fresh.
  useEffect(() => {
    if (!hasActiveTimers) return;
    const iv = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const finished = timers.some((x) => !x.done && x.endsAt <= t);
      if (!finished) return;
      setTimers((prev) => prev.map((x) => (!x.done && x.endsAt <= t ? { ...x, done: true } : x)));
      if (!muted) playTimerAlert();
      if (typeof navigator !== "undefined") navigator.vibrate?.([200, 100, 200, 100, 200]);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1400);
    }, 250);
    return () => clearInterval(iv);
  }, [hasActiveTimers, timers, muted]);

  // Keep the screen awake while cooking.
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          sentinel = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* unsupported or denied — ignore */
      }
    };
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, []);

  // Arrow-key navigation between steps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setCurrent((c) => Math.min(total - 1, c + 1));
      else if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  const startTimer = useCallback((seconds: number, label: string) => {
    primeTimerAudio();
    setTimers((prev) => [
      ...prev,
      {
        id: nextId.current++,
        label,
        endsAt: Date.now() + seconds * 1000,
        total: seconds,
        done: false,
      },
    ]);
    setNow(Date.now());
  }, []);

  const removeTimer = useCallback((id: number) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  function startCustom() {
    const min = Number(customMin.replace(",", "."));
    if (!Number.isFinite(min) || min <= 0) return;
    startTimer(Math.round(min * 60), `${min} min`);
    setCustomMin("");
  }

  if (total === 0 || !step) {
    return (
      <main className="bg-ink px-safe pb-safe pt-safe text-paper-50 fixed inset-0 flex flex-col items-center justify-center gap-4">
        <p className="font-written text-lg">Dieses Rezept hat keine Schritte.</p>
        <Link
          href={`/rezepte/${recipe.slug}`}
          className="font-hand text-paper-200 text-2xl underline"
        >
          ← zurück
        </Link>
      </main>
    );
  }

  return (
    <main className="bg-book-ambience px-safe pb-safe pt-safe fixed inset-0 flex flex-col">
      {flash && (
        <div className="bg-ribbon/30 pointer-events-none absolute inset-0 z-20 animate-pulse" />
      )}

      {/* Top bar */}
      <header className="text-paper-100 flex items-center justify-between gap-3 px-4 py-3">
        <Link
          href={`/rezepte/${recipe.slug}`}
          className="font-hand text-paper-200 text-xl underline underline-offset-4"
        >
          ← fertig
        </Link>
        <span className="font-hand min-w-0 flex-1 truncate text-center text-2xl">
          {recipe.title}
        </span>
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Ton an" : "Ton aus"}
          className="font-hand text-paper-200 text-xl"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </header>

      {/* Step card */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-4">
        <PaperSheet seed={`${recipe.slug}-${current}`} className="w-full max-w-2xl p-8 sm:p-12">
          <p className="font-written text-ink-faded text-sm tracking-wide uppercase">
            Schritt {current + 1} von {total}
          </p>
          <p className="font-written text-ink mt-4 text-2xl leading-relaxed whitespace-pre-line sm:text-3xl">
            {step.text}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {step.durationSeconds != null && (
              <button
                onClick={() => startTimer(step.durationSeconds!, `Schritt ${current + 1}`)}
                className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-4 py-2 text-xl"
              >
                ⏱ {formatDuration(step.durationSeconds)} starten
              </button>
            )}
            {PRESETS_MIN.map((m) => (
              <button
                key={m}
                onClick={() => startTimer(m * 60, `${m} min`)}
                className="bg-paper-200 font-written text-ink ring-paper-300 hover:bg-paper-300/60 rounded-sm px-3 py-1.5 text-sm ring-1"
              >
                +{m} min
              </button>
            ))}
            <span className="inline-flex items-center gap-1">
              <input
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startCustom()}
                inputMode="numeric"
                placeholder="min"
                aria-label="Eigener Timer in Minuten"
                className="border-ink-light bg-paper-50 text-ink w-16 rounded-sm border border-dotted px-2 py-1 text-center font-serif outline-none"
              />
              <button
                onClick={startCustom}
                className="bg-paper-200 font-written text-ink ring-paper-300 hover:bg-paper-300/60 rounded-sm px-3 py-1.5 text-sm ring-1"
              >
                Timer
              </button>
            </span>
          </div>
        </PaperSheet>
      </div>

      {/* Running timers */}
      {timers.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {timers.map((t) => {
            const remaining = Math.max(0, Math.ceil((t.endsAt - now) / 1000));
            return (
              <span
                key={t.id}
                className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 font-serif text-sm ${
                  t.done ? "bg-ribbon text-paper-50" : "bg-paper-100 text-ink ring-paper-300 ring-1"
                }`}
              >
                <span className="font-written">{t.label}</span>
                <span>{t.done ? "fertig! ⏰" : formatDuration(remaining)}</span>
                <button
                  onClick={() => removeTimer(t.id)}
                  aria-label="Timer entfernen"
                  className="font-hand text-base leading-none"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex items-center justify-between gap-4 px-4 py-3">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="bg-paper-200 font-hand text-ink rounded-sm px-5 py-2 text-xl disabled:opacity-30"
        >
          ← zurück
        </button>
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i === current ? "bg-paper-50" : "bg-paper-400/50"}`}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
          disabled={current === total - 1}
          className="bg-ribbon font-hand text-paper-50 rounded-sm px-5 py-2 text-xl disabled:opacity-30"
        >
          weiter →
        </button>
      </nav>
    </main>
  );
}
