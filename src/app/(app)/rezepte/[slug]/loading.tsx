import { Skeleton, SkeletonLine } from "@/components/oma/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10" aria-busy="true">
      <Skeleton className="aspect-[16/9] w-full" />
      <div className="mt-6 space-y-3">
        <SkeletonLine width="60%" className="h-8" />
        <SkeletonLine width="40%" />
        <SkeletonLine width="80%" />
      </div>
      <div className="mt-10 grid gap-10 sm:grid-cols-[1fr_2fr]">
        <div className="space-y-3">
          <SkeletonLine width="40%" className="h-5" />
          <SkeletonLine width="80%" />
          <SkeletonLine width="70%" />
          <SkeletonLine width="60%" />
          <SkeletonLine width="75%" />
        </div>
        <div className="space-y-3">
          <SkeletonLine width="40%" className="h-5" />
          <SkeletonLine width="100%" />
          <SkeletonLine width="95%" />
          <SkeletonLine width="100%" />
          <SkeletonLine width="80%" />
        </div>
      </div>
    </main>
  );
}
