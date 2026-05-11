import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getRecipeBySlug } from "@/lib/recipes/server";
import { ZeichnenClient } from "./ZeichnenClient";

export default async function ZeichnenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();
  if (recipe.createdById !== session.user.id) notFound();

  return (
    <ZeichnenClient
      recipeId={recipe.id}
      slug={slug}
      hasExisting={!!recipe.handwrittenPath}
    />
  );
}
