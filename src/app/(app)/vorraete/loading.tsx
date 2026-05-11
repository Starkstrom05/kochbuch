import { PageHeaderSkeleton, Skeleton, SkeletonLine } from "@/components/oma/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <PageHeaderSkeleton />
      <div className="paper-card p-6">
        <Skeleton className="h-24 w-full" />
        <div className="mt-4 space-y-2">
          <SkeletonLine width="70%" />
          <SkeletonLine width="50%" />
          <SkeletonLine width="60%" />
        </div>
      </div>
    </main>
  );
}
