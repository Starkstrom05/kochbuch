import { PageHeaderSkeleton, RecipeGridSkeleton } from "@/components/oma/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <PageHeaderSkeleton />
      <RecipeGridSkeleton />
    </main>
  );
}
