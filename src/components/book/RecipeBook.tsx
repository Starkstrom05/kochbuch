"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

// Auto-Pagination: Erst alle Zutaten-Seiten, dann alle Zubereitungs-Seiten.
// Die erste Ingredients-Seite hat Polaroid+Titel und damit weniger Platz.
// Heuristiken (Worst-Case-Fontmetrik); bei sehr langem Text ggf. nachtunen.
const INGREDIENTS_FIRST = 9;
const INGREDIENTS_CONT = 18;
const STEPS_PER_PAGE = 7;
const STEP_CHARS_PER_PAGE = 1300;

type RecipePage =
  | {
      recipe: BookRecipe;
      type: "ingredients";
      isFirstOfRecipe: boolean;
      ingredients: BookRecipe["ingredients"];
      pageIndex: number;
      pageTotal: number;
    }
  | {
      recipe: BookRecipe;
      type: "steps";
      isFirstOfRecipe: boolean;
      steps: string[];
      stepStartIndex: number;
      pageIndex: number;
      pageTotal: number;
    }
  | {
      recipe: BookRecipe;
      type: "blank";
      isFirstOfRecipe: false;
      pageIndex: number;
      pageTotal: number;
    };

function paginateRecipe(recipe: BookRecipe): RecipePage[] {
  const allIngredients = [...recipe.ingredients];
  const allSteps = recipe.instructions
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pages: RecipePage[] = [];

  // 1) Zutaten-Seiten — bis alle Zutaten verteilt sind
  if (allIngredients.length === 0) {
    pages.push({
      recipe,
      type: "ingredients",
      isFirstOfRecipe: true,
      ingredients: [],
      pageIndex: 0,
      pageTotal: 0,
    });
  } else {
    let firstIng = true;
    while (allIngredients.length > 0) {
      const cap = firstIng ? INGREDIENTS_FIRST : INGREDIENTS_CONT;
      pages.push({
        recipe,
        type: "ingredients",
        isFirstOfRecipe: firstIng,
        ingredients: allIngredients.splice(0, cap),
        pageIndex: pages.length,
        pageTotal: 0,
      });
      firstIng = false;
    }
  }

  // 2) Anleitungs-Seiten — Steps nach Anzahl + Zeichen-Budget verteilen
  let stepStartIdx = 0;
  while (allSteps.length > 0) {
    const steps: string[] = [];
    let charBudget = STEP_CHARS_PER_PAGE;
    while (allSteps.length > 0 && steps.length < STEPS_PER_PAGE) {
      const candidate = allSteps[0];
      if (steps.length > 0 && candidate.length > charBudget) break;
      steps.push(candidate);
      allSteps.shift();
      charBudget -= candidate.length;
    }
    pages.push({
      recipe,
      type: "steps",
      isFirstOfRecipe: false,
      steps,
      stepStartIndex: stepStartIdx,
      pageIndex: pages.length,
      pageTotal: 0,
    });
    stepStartIdx += steps.length;
  }

  // 3) Padding-Seite: wenn ungerade Seiten-Anzahl, leere Seite hinten dran —
  //    damit das nachfolgende Rezept wieder auf einer linken (Polaroid-)Seite
  //    beginnt.
  if (pages.length % 2 !== 0) {
    pages.push({
      recipe,
      type: "blank",
      isFirstOfRecipe: false,
      pageIndex: pages.length,
      pageTotal: 0,
    });
  }

  for (const p of pages) p.pageTotal = pages.length;
  return pages;
}

// Eine Doppelseite hat Aspect 1100:730 ≈ 1.507. Wir messen den verfuegbaren
// Platz und geben HTMLFlipBook FESTE Dimensionen (size="fixed"), damit die
// Library keine Stretch-Magie macht — das war die Quelle der Layout-Spruenge.
const PAGE_ASPECT = 1100 / 730;

function useBookDimensions(): {
  ref: React.RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1100, height: 730 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width: cw, height: ch } = el.getBoundingClientRect();
      if (cw === 0 || ch === 0) return;
      const fitByHeight = { width: ch * PAGE_ASPECT, height: ch };
      const fitByWidth = { width: cw, height: cw / PAGE_ASPECT };
      const chosen =
        fitByHeight.width <= cw ? fitByHeight : fitByWidth;
      setSize({
        width: Math.round(chosen.width),
        height: Math.round(chosen.height),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, ...size };
}

export type BookRecipe = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  instructions: string;
  /** Pfade relativ zum UPLOAD_DIR (z.B. /recipes/<id>/<image>.jpg). Erstes = Cover. */
  imagePaths: string[];
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
  const [lightbox, setLightbox] = useState<{ paths: string[]; index: number } | null>(null);
  const flipBookRef = useRef<{
    pageFlip: () => { flipPrev(): void; flipNext(): void; getPageCount(): number };
  } | null>(null);
  const { ref: containerRef, width, height } = useBookDimensions();

  // Pre-compute paginated pages pro Rezept. Cache via useMemo damit Re-Renders
  // (z.B. von Resize) nicht jedes Mal neu rechnen.
  const paginatedPages = useMemo(
    () => recipes.flatMap((r) => paginateRecipe(r)),
    [recipes],
  );

  const totalPages = 2 + paginatedPages.length;

  const onFlip = useCallback((e: { data: number }) => {
    if (!soundIsMuted()) playPageFlip();
    setCurrentPage(e.data);
  }, []);

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
      if (lightbox) {
        if (e.key === "Escape") setLightbox(null);
        else if (e.key === "ArrowLeft" && lightbox.index > 0)
          setLightbox({ ...lightbox, index: lightbox.index - 1 });
        else if (e.key === "ArrowRight" && lightbox.index < lightbox.paths.length - 1)
          setLightbox({ ...lightbox, index: lightbox.index + 1 });
        return;
      }
      if (e.key === "ArrowLeft") flipPrev();
      else if (e.key === "ArrowRight") flipNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipPrev, flipNext, lightbox]);

  const openLightbox = useCallback((paths: string[], index: number) => {
    setLightbox({ paths, index });
  }, []);

  // HTMLFlipBook bekommt pro Seite die halbe gemessene Buchbreite —
  // damit ist das Buch immer exakt so groß wie der verfügbare Container,
  // ohne dass size="stretch" interne Layoutsprünge auslöst.
  const pageWidth = Math.max(300, Math.floor(width / 2));
  const pageHeight = Math.max(400, height);

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

      <div
        ref={containerRef}
        className="relative flex min-h-0 w-full flex-1 items-center justify-center px-4 pb-6 pt-2"
      >
        {width > 0 && height > 0 ? (
          <HTMLFlipBook
            ref={flipBookRef as never}
            className=""
            style={{}}
            startPage={0}
            width={pageWidth}
            height={pageHeight}
            size="fixed"
            minWidth={pageWidth}
            maxWidth={pageWidth}
            minHeight={pageHeight}
            maxHeight={pageHeight}
            drawShadow={true}
            flippingTime={650}
            usePortrait={false}
            startZIndex={0}
            autoSize={false}
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

            {paginatedPages.map((page, idx) => {
              const key = `${page.recipe.id}-${page.pageIndex}`;
              const variant = idx % 2 === 0 ? "left" : "right";
              return (
                <BookPage
                  key={key}
                  seed={key}
                  pageNumber={idx + 1}
                  variant={variant}
                >
                  <BookPageContent page={page} onImageClick={openLightbox} />
                </BookPage>
              );
            })}

            <BookCover back>
              <BackCover />
            </BookCover>
          </HTMLFlipBook>
        ) : null}
      </div>

      {lightbox ? (
        <Lightbox
          paths={lightbox.paths}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onPrev={() => setLightbox((prev) => (prev && prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev))}
          onNext={() => setLightbox((prev) => (prev && prev.index < prev.paths.length - 1 ? { ...prev, index: prev.index + 1 } : prev))}
        />
      ) : null}
    </div>
  );
}

function Lightbox({
  paths,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  paths: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const path = paths[index];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Bild-Vollbildansicht"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/images${path}`}
        alt="Rezeptbild in voller Größe"
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Schließen"
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-sm bg-paper-50/10 font-hand text-2xl text-paper-50 hover:bg-paper-50/20"
      >
        ×
      </button>
      {paths.length > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            disabled={index === 0}
            aria-label="Vorheriges Bild"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-sm bg-paper-50/10 px-3 py-2 font-hand text-3xl text-paper-50 hover:bg-paper-50/20 disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            disabled={index === paths.length - 1}
            aria-label="Nächstes Bild"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-sm bg-paper-50/10 px-3 py-2 font-hand text-3xl text-paper-50 hover:bg-paper-50/20 disabled:opacity-30"
          >
            ›
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 font-written text-sm text-paper-50/80">
            {index + 1} / {paths.length}
          </p>
        </>
      ) : null}
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

function BookPageContent({
  page,
  onImageClick,
}: {
  page: RecipePage;
  onImageClick: (paths: string[], index: number) => void;
}) {
  if (page.type === "blank") {
    return <div className="h-full w-full" />;
  }
  if (page.type === "ingredients") {
    return <IngredientsPage page={page} onImageClick={onImageClick} />;
  }
  return <StepsPage page={page} />;
}

function IngredientsPage({
  page,
  onImageClick,
}: {
  page: Extract<RecipePage, { type: "ingredients" }>;
  onImageClick: (paths: string[], index: number) => void;
}) {
  const { recipe, isFirstOfRecipe, ingredients, pageIndex, pageTotal } = page;
  const avgStars =
    recipe.ratings.length > 0
      ? recipe.ratings.reduce((s, r) => s + r.stars, 0) / recipe.ratings.length
      : 0;
  const time =
    (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) || null;
  const cover = recipe.imagePaths[0];
  const additional = recipe.imagePaths.slice(1, 4);
  const hasMorePages = pageTotal > 1;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* Polaroid nur auf der ersten Seite eines Rezepts */}
      {isFirstOfRecipe && cover ? (
        <button
          type="button"
          onClick={() => onImageClick(recipe.imagePaths, 0)}
          aria-label="Bild in voller Größe öffnen"
          className="absolute right-1 top-1 z-10 rotate-[-5deg] bg-paper-50 p-2 pb-7 shadow-[0_14px_32px_-8px_rgba(20,12,6,0.6),0_4px_10px_-2px_rgba(20,12,6,0.4)] ring-1 ring-paper-300 transition hover:rotate-[-3deg] hover:scale-[1.02] sm:p-3 sm:pb-10"
          style={{ width: "min(55%, 18rem)" }}
        >
          {/* Klebeband oben links */}
          <span
            aria-hidden
            className="absolute -left-3 -top-2 h-5 w-14 rotate-[-30deg] bg-amber-200/70 ring-1 ring-amber-300/40"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
          />
          {/* Klebeband oben rechts */}
          <span
            aria-hidden
            className="absolute -right-3 -top-2 h-5 w-14 rotate-[28deg] bg-amber-200/70 ring-1 ring-amber-300/40"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
          />
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/images${cover}`}
              alt={recipe.title}
              className="h-full w-full object-cover sepia-[0.18]"
              loading="lazy"
            />
            {recipe.imagePaths.length > 1 ? (
              <span className="absolute bottom-1 right-1 rounded-sm bg-ink/70 px-1.5 py-0.5 font-hand text-xs text-paper-50">
                +{recipe.imagePaths.length - 1}
              </span>
            ) : null}
          </div>
          <span className="absolute inset-x-3 bottom-2 truncate text-center font-hand text-base text-ink-faded">
            {recipe.title}
          </span>
        </button>
      ) : null}

      {isFirstOfRecipe ? (
        <div className={cover ? "pr-[58%]" : ""}>
          <h2 className="font-hand text-2xl leading-tight text-ink ink-text md:text-3xl">
            {recipe.title}
          </h2>
          {recipe.description ? (
            <p className="mt-1 line-clamp-2 font-written text-sm text-ink-faded">
              {recipe.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-written text-xs text-ink-faded">
            {avgStars > 0 ? (
              <HandwrittenStars value={avgStars} seed={recipe.id} size={14} />
            ) : null}
            <span>{recipe.servings} Portionen</span>
            {time ? <span>{time} Min</span> : null}
          </div>
        </div>
      ) : (
        <div>
          <p className="font-written text-xs uppercase tracking-wide text-ink-faded">
            Zutaten – Fortsetzung
          </p>
          <h2 className="font-hand text-xl leading-tight text-ink ink-text">
            {recipe.title}
          </h2>
        </div>
      )}

      {additional.length > 0 ? (
        <div className="mt-2 flex gap-1.5">
          {additional.map((path, i) => (
            <button
              key={path}
              type="button"
              onClick={() => onImageClick(recipe.imagePaths, i + 1)}
              aria-label={`Bild ${i + 2} öffnen`}
              className="relative h-10 w-14 overflow-hidden rounded-sm ring-1 ring-paper-300 hover:ring-ribbon"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/images${path}`}
                alt={`Bild ${i + 2}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}

      <Divider variant="dotted" className="my-3" />

      {ingredients.length > 0 ? (
        <>
          {isFirstOfRecipe ? (
            <h3 className="font-hand text-xl text-ink">Zutaten</h3>
          ) : null}
          <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-hidden font-written text-base text-ink">
            {ingredients.map((ri, i) => (
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
        </>
      ) : (
        <div className="flex-1" />
      )}

      {hasMorePages ? (
        <p className="mt-2 text-right font-written text-xs text-ink-faded">
          {pageIndex + 1} / {pageTotal}
        </p>
      ) : null}
    </div>
  );
}

function StepsPage({
  page,
}: {
  page: Extract<RecipePage, { type: "steps" }>;
}) {
  const { recipe, steps, stepStartIndex, pageIndex, pageTotal } = page;
  const isFirstStepsPage = stepStartIndex === 0;
  const isLast = pageIndex === pageTotal - 1;

  return (
    <div className="flex h-full flex-col">
      <h3 className="font-hand text-xl text-ink">
        {isFirstStepsPage ? "Zubereitung" : "Zubereitung – Fortsetzung"}
      </h3>
      <Divider variant="berries" className="my-3" />
      <ol className="min-h-0 flex-1 space-y-3 overflow-hidden font-written text-base leading-relaxed text-ink">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="font-hand text-2xl leading-none text-ribbon">
              {stepStartIndex + i + 1}.
            </span>
            <span>{step.replace(/^\d+\.\s*/, "")}</span>
          </li>
        ))}
      </ol>
      {isLast ? (
        <div className="mt-auto pt-4">
          <Link
            href={`/rezepte/${recipe.slug}`}
            className="font-written text-xs text-ink-faded underline underline-offset-4"
          >
            → in der Listenansicht öffnen
          </Link>
        </div>
      ) : null}
      {pageTotal > 1 ? (
        <p className="mt-2 text-right font-written text-xs text-ink-faded">
          {pageIndex + 1} / {pageTotal}
        </p>
      ) : null}
    </div>
  );
}

