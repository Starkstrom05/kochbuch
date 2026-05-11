"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import HTMLFlipBook from "react-pageflip";
import { BookPage } from "./BookPage";
import { BookCover } from "./BookCover";
import { HandwrittenStars } from "@/components/oma/HandwrittenStars";
import { Divider } from "@/components/oma/Divider";
import { formatAmount } from "@/lib/units/fraction";
import {
  isMuted as soundIsMuted,
  loadMuted,
  playPageFlip,
  setMuted as setSoundMuted,
} from "@/lib/sound/pageFlip";

export type BookRecipe = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  instructions: string;
  coverImagePath: string | null;
  tags: string | null;
  ingredients: {
    amount: number | null;
    unit: string | null;
    note: string | null;
    ingredient: { name: string };
  }[];
  ratings: { stars: number }[];
};

type Props = {
  recipes: BookRecipe[];
  title: string;
  subtitle: string;
};

export function RecipeBook({ recipes, title, subtitle }: Props) {
  const [muted, setMutedState] = useState<boolean>(() => loadMuted());
  const [currentPage, setCurrentPage] = useState(0);
  const flipBookRef = useRef<{ pageFlip: () => { flipPrev(): void; flipNext(): void; getPageCount(): number } } | null>(
    null,
  );

  const totalPages = useMemo(() => 2 + recipes.length * 2, [recipes.length]);

  const onFlip = useCallback(
    (e: { data: number }) => {
      if (!soundIsMuted()) playPageFlip();
      setCurrentPage(e.data);
    },
    [],
  );

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMutedState(next);
    setSoundMuted(next);
  }, [muted]);

  const flipPrev = useCallback(() => {
    flipBookRef.current?.pageFlip().flipPrev();
  }, []);
  const flipNext = useCallback(() => {
    flipBookRef.current?.pageFlip().flipNext();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") flipPrev();
      else if (e.key === "ArrowRight") flipNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipPrev, flipNext]);

  return (
    <div className="flex h-full w-full flex-col items-center">
      <Toolbar
        currentPage={currentPage}
        totalPages={totalPages}
        muted={muted}
        onToggleMute={toggleMute}
        onPrev={flipPrev}
        onNext={flipNext}
      />

      <div className="relative w-full flex-1 px-4 pb-6 pt-2">
        {/* The element below is the actual flippable book */}
        <HTMLFlipBook
          ref={flipBookRef as never}
          className="mx-auto"
          style={{}}
          startPage={0}
          width={550}
          height={730}
          size="stretch"
          minWidth={300}
          maxWidth={1100}
          minHeight={420}
          maxHeight={1500}
          drawShadow={true}
          flippingTime={650}
          usePortrait={true}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.5}
          showCover={true}
          mobileScrollSupport={true}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
          onFlip={onFlip}
        >
          <BookCover>
            <FrontCover title={title} subtitle={subtitle} count={recipes.length} />
          </BookCover>

          {recipes.flatMap((recipe, idx) => [
            <BookPage
              key={`${recipe.id}-l`}
              seed={`${recipe.id}-l`}
              pageNumber={idx * 2 + 1}
              variant="left"
            >
              <RecipeLeftPage recipe={recipe} />
            </BookPage>,
            <BookPage
              key={`${recipe.id}-r`}
              seed={`${recipe.id}-r`}
              pageNumber={idx * 2 + 2}
              variant="right"
            >
              <RecipeRightPage recipe={recipe} />
            </BookPage>,
          ])}

          <BookCover back>
            <BackCover />
          </BookCover>
        </HTMLFlipBook>
      </div>
    </div>
  );
}

function Toolbar({
  currentPage,
  totalPages,
  muted,
  onToggleMute,
  onPrev,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  muted: boolean;
  onToggleMute: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3 px-4 py-3 text-paper-50">
      <Link
        href="/rezepte"
        className="rounded-sm bg-paper-50/10 px-3 py-1 font-hand text-lg backdrop-blur hover:bg-paper-50/20"
      >
        ← zur Liste
      </Link>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Zurückblättern"
          className="rounded-sm bg-paper-50/10 px-3 py-1 font-hand text-lg backdrop-blur hover:bg-paper-50/20"
        >
          ‹
        </button>
        <span className="font-written text-sm text-paper-50/80">
          Seite {Math.min(currentPage + 1, totalPages)} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Weiterblättern"
          className="rounded-sm bg-paper-50/10 px-3 py-1 font-hand text-lg backdrop-blur hover:bg-paper-50/20"
        >
          ›
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? "Ton einschalten" : "Ton ausschalten"}
        className="rounded-sm bg-paper-50/10 px-3 py-1 font-hand text-lg backdrop-blur hover:bg-paper-50/20"
        title={muted ? "Ton einschalten" : "Ton ausschalten"}
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}

function FrontCover({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="text-amber-50">
      <p className="font-written text-sm uppercase tracking-widest text-amber-200/70">
        — Aus der Küche —
      </p>
      <h1 className="mt-6 font-hand text-5xl leading-tight md:text-6xl">{title}</h1>
      <div className="mt-6 flex justify-center">
        <Divider variant="flourish" className="w-40 text-amber-200" />
      </div>
      <p className="mt-6 font-written text-lg text-amber-100/90">{subtitle}</p>
      <p className="mt-10 font-hand text-xl text-amber-200/80">{count} Rezepte</p>
    </div>
  );
}

function BackCover() {
  return (
    <div className="text-amber-50">
      <p className="font-hand text-3xl">Mahlzeit!</p>
      <div className="mt-4 flex justify-center">
        <Divider variant="flourish" className="w-32 text-amber-200" />
      </div>
      <p className="mt-6 font-written text-sm text-amber-100/70">— Ende —</p>
    </div>
  );
}

function RecipeLeftPage({ recipe }: { recipe: BookRecipe }) {
  const avgStars =
    recipe.ratings.length > 0
      ? recipe.ratings.reduce((s, r) => s + r.stars, 0) / recipe.ratings.length
      : 0;
  const time =
    (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) || null;

  return (
    <div className="flex h-full flex-col">
      <h2 className="font-hand text-3xl text-ink ink-text md:text-4xl">{recipe.title}</h2>
      {recipe.description ? (
        <p className="mt-2 font-written text-base text-ink-faded">{recipe.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-written text-sm text-ink-faded">
        {avgStars > 0 ? <HandwrittenStars value={avgStars} seed={recipe.id} size={16} /> : null}
        <span>{recipe.servings} Portionen</span>
        {time ? <span>{time} Min</span> : null}
      </div>

      <Divider variant="dotted" className="my-4" />

      <h3 className="font-hand text-xl text-ink">Zutaten</h3>
      <ul className="mt-2 space-y-1 font-written text-base text-ink">
        {recipe.ingredients.map((ri, i) => (
          <li key={i} className="flex gap-2">
            <span className="min-w-[3.5rem] shrink-0 font-serif tabular-nums text-ink-faded">
              {ri.amount != null ? formatAmount(ri.amount) : ""}
              {ri.unit ? ` ${ri.unit}` : ""}
            </span>
            <span>
              {ri.ingredient.name}
              {ri.note ? <span className="text-ink-faded"> · {ri.note}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecipeRightPage({ recipe }: { recipe: BookRecipe }) {
  const steps = recipe.instructions
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="flex h-full flex-col">
      <h3 className="font-hand text-xl text-ink">Zubereitung</h3>
      <Divider variant="berries" className="my-3" />
      <ol className="space-y-3 font-written text-base leading-relaxed text-ink">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="font-hand text-2xl leading-none text-ribbon">{i + 1}.</span>
            <span>{step.replace(/^\d+\.\s*/, "")}</span>
          </li>
        ))}
      </ol>
      <div className="mt-auto pt-4">
        <Link
          href={`/rezepte/${recipe.slug}`}
          className="font-written text-xs text-ink-faded underline underline-offset-4"
        >
          → in der Listenansicht öffnen
        </Link>
      </div>
    </div>
  );
}
