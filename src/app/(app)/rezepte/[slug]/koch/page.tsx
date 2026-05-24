import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getRecipeBySlug } from "@/lib/recipes/server";
import { splitInstructionsToSteps } from "@/lib/recipes/steps";
import { CookMode } from "@/components/cook/CookMode";

export default async function KochPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const recipe = await getRecipeBySlug(slug, session.user.familyId);
  if (!recipe) notFound();

  // Strukturierte Schritte bevorzugen; Bestandsrezepte ohne Steps fallen auf
  // die Freitext-Anleitung zurück (Lazy-Fallback, kein Backfill nötig).
  const steps =
    recipe.steps.length > 0
      ? recipe.steps.map((s) => ({ text: s.text, durationSeconds: s.durationSeconds }))
      : splitInstructionsToSteps(recipe.instructions);

  return <CookMode recipe={{ title: recipe.title, slug: recipe.slug }} steps={steps} />;
}
