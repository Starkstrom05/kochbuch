"use client";

import { useState, useTransition } from "react";
import { rateRecipeAction } from "@/app/(app)/rezepte/[slug]/rate-action";
import { hashSeed } from "@/lib/visual/hash";

const STAR_PATH =
  "M12 2.5l2.6 6.1 6.4.6-4.8 4.4 1.4 6.4L12 16.8 6.4 20l1.4-6.4-4.8-4.4 6.4-.6L12 2.5z";

type Props = {
  recipeId: string;
  initial: number;
  seed?: string;
};

export function RatingPicker({ recipeId, initial, seed = "stars" }: Props) {
  const [stars, setStars] = useState(initial);
  const [hover, setHover] = useState(0);
  const [isPending, startTransition] = useTransition();
  const h = hashSeed(seed);

  const display = hover || stars;

  function setRating(value: number) {
    setStars(value);
    startTransition(() => rateRecipeAction({ recipeId, stars: value }));
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="font-written text-sm text-ink-faded">
        {stars > 0 ? "Deine Bewertung:" : "Bewerten:"}
      </span>
      <div className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 5 }).map((_, i) => {
          const value = i + 1;
          const filled = value <= display;
          const rot = ((h >> (i * 2)) % 7) - 3;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(value)}
              onClick={() => setRating(value)}
              aria-label={`${value} Sterne`}
              className="transition-transform hover:scale-110 disabled:opacity-50"
              disabled={isPending}
            >
              <svg
                viewBox="0 0 24 24"
                width={28}
                height={28}
                style={{ transform: `rotate(${rot}deg)` }}
                aria-hidden="true"
              >
                <path
                  d={STAR_PATH}
                  fill={filled ? "var(--color-ribbon)" : "transparent"}
                  stroke="#5A4A30"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                  filter="url(#ink-bleed)"
                />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
