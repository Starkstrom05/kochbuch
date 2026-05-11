type Props = {
  className?: string;
};

export function Skeleton({ className }: Props) {
  return (
    <div
      className={`animate-pulse rounded-sm bg-paper-200/60 ring-1 ring-paper-300/40 ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonLine({ width = "100%", className }: { width?: string; className?: string }) {
  return (
    <div
      className={`h-3 animate-pulse rounded-full bg-paper-200/60 ${className ?? ""}`}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function RecipeCardSkeleton() {
  return (
    <div className="paper-card hand-tilt-1 p-4">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="mt-3 space-y-2">
        <SkeletonLine width="70%" />
        <SkeletonLine width="45%" />
        <SkeletonLine width="60%" />
      </div>
    </div>
  );
}

export function RecipeGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Lädt Rezepte…"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ShoppingListSkeleton() {
  return (
    <div className="space-y-3" aria-label="Lädt Einkaufsliste…" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="paper-card flex items-center gap-3 p-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="55%" />
            <SkeletonLine width="30%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8 space-y-3">
      <SkeletonLine width="240px" className="h-6" />
      <SkeletonLine width="60%" className="h-3" />
    </div>
  );
}
