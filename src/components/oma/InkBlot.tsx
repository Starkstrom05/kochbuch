import { hashSeed } from "@/lib/visual/hash";

const BLOT_PATHS = [
  "M14 4 C 22 2 26 8 24 14 C 28 16 27 22 22 24 C 19 28 12 27 9 23 C 4 22 2 16 6 13 C 4 7 9 3 14 4 Z",
  "M12 6 C 18 2 26 6 25 13 C 30 17 25 24 19 23 C 14 28 6 25 7 19 C 2 16 4 9 12 6 Z",
  "M10 8 C 14 3 22 4 24 9 C 30 12 28 21 22 22 C 18 28 9 25 8 20 C 3 18 5 10 10 8 Z M 24 16 a 1.5 1.5 0 1 0 0.1 0 Z",
  "M15 5 C 21 3 27 7 26 13 C 28 19 22 24 16 22 C 10 26 4 20 6 14 C 4 9 10 6 15 5 Z",
];

type Props = {
  seed: string;
  count?: number;
  className?: string;
};

export function InkBlots({ seed, count = 2, className }: Props) {
  const h = hashSeed(seed);
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        const k = hashSeed(`${seed}-blot-${i}`);
        const variant = k % BLOT_PATHS.length;
        const left = 4 + (k % 88);
        const top = 6 + ((k >> 3) % 86);
        const size = 18 + ((k >> 5) % 28);
        const rot = ((k >> 7) % 360);
        const opacity = 0.06 + (((k >> 9) % 7) * 0.01);
        const color = (h >> i) % 5 === 0 ? "var(--color-ribbon)" : "#1A1008";
        return (
          <svg
            key={i}
            viewBox="0 0 32 32"
            width={size}
            height={size}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              transform: `translate(-50%, -50%) rotate(${rot}deg)`,
              opacity,
            }}
          >
            <path d={BLOT_PATHS[variant]} fill={color} filter="url(#ink-blot)" />
          </svg>
        );
      })}
    </div>
  );
}
