import type { ReactElement, ReactNode } from "react";

type Illustration = "recipes" | "shopping" | "pantry" | "search" | "notes";

type Props = {
  illustration?: Illustration;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

const ILLUSTRATIONS: Record<Illustration, ReactElement> = {
  recipes: (
    <svg viewBox="0 0 120 100" width="120" height="100" aria-hidden="true">
      <path
        d="M20 20 L 100 20 L 100 84 L 60 80 L 20 84 Z"
        fill="#F5EAD3"
        stroke="#5A4A30"
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#ink-bleed)"
      />
      <path d="M60 80 L 60 24" stroke="#5A4A30" strokeWidth="1.5" />
      <path d="M28 32 L 52 32 M 28 40 L 50 40 M 28 48 L 52 48 M 28 56 L 48 56" stroke="var(--color-sepia)" strokeWidth="1" />
      <path d="M68 32 L 92 32 M 68 40 L 90 40 M 68 48 L 92 48 M 68 56 L 86 56" stroke="var(--color-sepia)" strokeWidth="1" />
      <path d="M58 18 Q 60 12 64 16 T 70 14" stroke="var(--color-ribbon)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  ),
  shopping: (
    <svg viewBox="0 0 120 100" width="120" height="100" aria-hidden="true">
      <path
        d="M30 30 L 90 30 L 86 86 L 34 86 Z"
        fill="#F5EAD3"
        stroke="#5A4A30"
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#ink-bleed)"
      />
      <path
        d="M42 30 C 42 20 50 14 60 14 C 70 14 78 20 78 30"
        fill="none"
        stroke="#5A4A30"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="4" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.8" />
      <path d="M68 46 C 68 56 76 56 76 46" fill="#D4A03A" stroke="#5A4A30" strokeWidth="0.8" />
      <ellipse cx="58" cy="68" rx="6" ry="4" fill="#7A8A5A" stroke="#5A4A30" strokeWidth="0.8" />
    </svg>
  ),
  pantry: (
    <svg viewBox="0 0 120 100" width="120" height="100" aria-hidden="true">
      <rect
        x="24"
        y="20"
        width="72"
        height="68"
        rx="4"
        fill="#F5EAD3"
        stroke="#5A4A30"
        strokeWidth="2"
        filter="url(#ink-bleed)"
      />
      <line x1="24" y1="42" x2="96" y2="42" stroke="#5A4A30" strokeWidth="1.2" />
      <line x1="24" y1="64" x2="96" y2="64" stroke="#5A4A30" strokeWidth="1.2" />
      <rect x="34" y="26" width="12" height="14" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.8" />
      <rect x="52" y="28" width="10" height="12" fill="#7A8A5A" stroke="#5A4A30" strokeWidth="0.8" />
      <rect x="68" y="24" width="14" height="16" fill="#D4A03A" stroke="#5A4A30" strokeWidth="0.8" />
      <circle cx="40" cy="54" r="6" fill="#D4A03A" stroke="#5A4A30" strokeWidth="0.8" />
      <rect x="56" y="48" width="10" height="14" fill="var(--color-ribbon)" stroke="#5A4A30" strokeWidth="0.8" />
      <rect x="72" y="50" width="12" height="12" fill="#7A8A5A" stroke="#5A4A30" strokeWidth="0.8" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 120 100" width="120" height="100" aria-hidden="true">
      <circle
        cx="48"
        cy="46"
        r="24"
        fill="#F5EAD3"
        stroke="#5A4A30"
        strokeWidth="2.5"
        filter="url(#ink-bleed)"
      />
      <path
        d="M66 64 L 92 86"
        stroke="#5A4A30"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M40 40 Q 44 36 50 38" stroke="var(--color-sepia)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  notes: (
    <svg viewBox="0 0 120 100" width="120" height="100" aria-hidden="true">
      <rect
        x="28"
        y="18"
        width="64"
        height="76"
        fill="#F5EAD3"
        stroke="#5A4A30"
        strokeWidth="2"
        filter="url(#ink-bleed)"
        transform="rotate(-3 60 56)"
      />
      <g transform="rotate(-3 60 56)">
        <path d="M36 32 L 84 32 M 36 42 L 78 42 M 36 52 L 82 52 M 36 62 L 70 62 M 36 72 L 78 72" stroke="var(--color-sepia)" strokeWidth="1" />
        <path d="M40 22 Q 44 26 48 22" stroke="var(--color-ribbon)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  ),
};

export function EmptyState({ illustration = "recipes", title, description, action, className }: Props) {
  return (
    <div className={`paper-card hand-tilt-2 mx-auto max-w-md p-8 text-center ${className ?? ""}`}>
      <div className="mx-auto mb-4 flex justify-center opacity-90">
        {ILLUSTRATIONS[illustration]}
      </div>
      <p className="font-hand text-3xl text-ink ink-text">{title}</p>
      {description ? (
        <p className="mt-2 font-written text-ink-faded">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
