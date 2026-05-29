import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ImportClient } from "@/components/import/ImportClient";
import { categoryVisibleToCookbook } from "@/lib/recipes/visibility";
import { createRecipeAction } from "../actions";

export default async function ImportierenPage() {
  const session = await auth();
  const categories = await prisma.category.findMany({
    where: categoryVisibleToCookbook(session?.user?.activeCookbookId),
    orderBy: { name: "asc" },
  });

  return (
    <main className="pt-safe px-safe pb-safe mx-auto max-w-4xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-hand text-ink ink-text text-5xl">Rezept importieren</h1>
        <Link
          href="/rezepte"
          className="font-written text-ribbon text-sm underline underline-offset-4"
        >
          zurück zur Übersicht
        </Link>
      </header>

      <ImportClient categories={categories} createAction={createRecipeAction} />
    </main>
  );
}
