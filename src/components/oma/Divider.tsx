type Variant = "wave" | "flourish" | "berries" | "dotted";

type Props = {
  variant?: Variant;
  className?: string;
};

export function Divider({ variant = "wave", className }: Props) {
  return (
    <svg
      viewBox="0 0 200 16"
      className={`mx-auto h-5 w-full max-w-xs ${className ?? ""}`}
      aria-hidden="true"
    >
      {variant === "wave" ? (
        <>
          <path
            d="M2 8 Q 30 3 60 8 T 120 8 T 198 8"
            stroke="var(--color-sepia)"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            filter="url(#ink-bleed)"
          />
          <circle cx="100" cy="8" r="1.8" fill="var(--color-ribbon)" />
        </>
      ) : null}

      {variant === "flourish" ? (
        <>
          <path
            d="M10 8 C 30 0 70 16 100 8 C 130 0 170 16 190 8"
            stroke="var(--color-sepia)"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            filter="url(#ink-bleed)"
          />
          <path
            d="M100 8 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0"
            fill="#D4A03A"
            stroke="#5A4A30"
            strokeWidth="0.8"
          />
          <path d="M100 5 L 100 1" stroke="#5A4A30" strokeWidth="0.8" strokeLinecap="round" />
        </>
      ) : null}

      {variant === "berries" ? (
        <>
          <path
            d="M2 9 Q 50 6 100 9 T 198 9"
            stroke="#5A4A30"
            strokeWidth="0.9"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="95" cy="9" r="2.2" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.6" />
          <circle cx="100" cy="7" r="2.2" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.6" />
          <circle cx="105" cy="9" r="2.2" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.6" />
          <path d="M98 5 L 100 2 L 103 4" stroke="#5A4A30" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        </>
      ) : null}

      {variant === "dotted" ? (
        <>
          {[20, 50, 80, 100, 120, 150, 180].map((cx, i) => (
            <circle
              key={cx}
              cx={cx}
              cy="8"
              r={i === 3 ? 2.4 : 1.4}
              fill={i === 3 ? "var(--color-ribbon)" : "var(--color-sepia)"}
              filter="url(#ink-bleed)"
            />
          ))}
        </>
      ) : null}
    </svg>
  );
}
