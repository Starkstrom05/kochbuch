export function InkFilters() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ position: "absolute" }}
    >
      <defs>
        <filter id="ink-bleed" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="0.6" />
        </filter>
        <filter id="ink-blot" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="3" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="3" />
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
      </defs>
    </svg>
  );
}
