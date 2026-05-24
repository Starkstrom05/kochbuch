import type { ReactElement } from "react";

type Variant = "leaf" | "swirl" | "berry" | "flower" | "arrow" | "heart";

type Props = {
  variant?: Variant;
  size?: number;
  color?: string;
  className?: string;
};

const PATHS: Record<Variant, ReactElement> = {
  leaf: (
    <>
      <path
        d="M4 20 C 6 10 14 4 24 4 C 22 14 14 20 4 20 Z"
        fill="#7A8A5A"
        stroke="#5A4A30"
        strokeWidth="1.2"
        filter="url(#ink-bleed)"
      />
      <path d="M4 20 C 10 16 16 12 22 6" stroke="#5A4A30" strokeWidth="0.8" fill="none" />
    </>
  ),
  swirl: (
    <path
      d="M2 12 C 2 6 8 4 12 8 C 16 12 12 18 8 16 C 4 14 6 10 10 11"
      fill="none"
      stroke="#5A4A30"
      strokeWidth="1.2"
      strokeLinecap="round"
      filter="url(#ink-bleed)"
    />
  ),
  berry: (
    <>
      <circle cx="8" cy="14" r="3" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.8" />
      <circle cx="14" cy="12" r="2.5" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.8" />
      <circle cx="12" cy="17" r="2.2" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.8" />
      <path d="M10 11 L 12 4 L 16 5" stroke="#5A4A30" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </>
  ),
  flower: (
    <>
      <circle cx="12" cy="12" r="2.4" fill="#D4A03A" stroke="#5A4A30" strokeWidth="0.8" />
      <ellipse cx="12" cy="5" rx="2.2" ry="3.4" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.8" />
      <ellipse cx="12" cy="19" rx="2.2" ry="3.4" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.8" />
      <ellipse cx="5" cy="12" rx="3.4" ry="2.2" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.8" />
      <ellipse cx="19" cy="12" rx="3.4" ry="2.2" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.8" />
    </>
  ),
  arrow: (
    <path
      d="M3 12 C 8 8 14 8 20 11 M 16 7 L 20 11 L 16 15"
      fill="none"
      stroke="#5A4A30"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#ink-bleed)"
    />
  ),
  heart: (
    <path
      d="M12 21 C 4 15 2 9 6 6 C 9 4 11 6 12 8 C 13 6 15 4 18 6 C 22 9 20 15 12 21 Z"
      fill="var(--color-ribbon)"
      stroke="#5A4A30"
      strokeWidth="1.2"
      strokeLinejoin="round"
      filter="url(#ink-bleed)"
    />
  ),
};

export function Ornament({ variant = "leaf", size = 24, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {PATHS[variant]}
    </svg>
  );
}
