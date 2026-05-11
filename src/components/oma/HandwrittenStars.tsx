import { hashSeed } from "@/lib/visual/hash";

const STAR_PATH =
  "M12 2.5l2.6 6.1 6.4.6-4.8 4.4 1.4 6.4L12 16.8 6.4 20l1.4-6.4-4.8-4.4 6.4-.6L12 2.5z";

type Props = {
  value: number;
  max?: number;
  size?: number;
  seed?: string;
  className?: string;
};

export function HandwrittenStars({
  value,
  max = 5,
  size = 22,
  seed = "stars",
  className,
}: Props) {
  const h = hashSeed(seed);
  return (
    <span className={`inline-flex items-center gap-0.5 ${className ?? ""}`} aria-label={`${value} von ${max} Sternen`}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(value);
        const rot = ((h >> (i * 2)) % 7) - 3;
        return (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width={size}
            height={size}
            style={{ transform: `rotate(${rot}deg)` }}
            aria-hidden="true"
          >
            <path
              d={STAR_PATH}
              fill={filled ? "#A23E2E" : "transparent"}
              stroke="#5A4A30"
              strokeWidth="1.4"
              strokeLinejoin="round"
              filter="url(#ink-bleed)"
            />
          </svg>
        );
      })}
    </span>
  );
}
