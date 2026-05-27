import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getRecipeBySlug } from "@/lib/recipes/server";
import { decideWriteRecipe } from "@/lib/cookbooks/permissions";
import { ZeichnenClient } from "./ZeichnenClient";

export default async function ZeichnenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const recipe = await getRecipeBySlug(slug, {
    id: session.user.id,
    role: session.user.role,
  });
  if (!recipe) notFound();
  // Handschrift-Notiz nur fuer Owner oder Admin.
  const canWrite = decideWriteRecipe({ id: session.user.id, role: session.user.role }, recipe);
  if (!canWrite) notFound();

  return <ZeichnenClient recipeId={recipe.id} slug={slug} hasExisting={!!recipe.handwrittenPath} />;
}
