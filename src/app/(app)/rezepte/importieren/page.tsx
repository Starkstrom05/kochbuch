import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { ImportClient } from "@/components/import/ImportClient";
import { createRecipeAction } from "../actions";

export default async function ImportierenPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="font-hand text-5xl text-ink ink-text">Rezept importieren</h1>
        <Link href="/rezepte" className="font-written text-sm text-ribbon underline underline-offset-4">
          zurück zur Übersicht
        </Link>
      </header>

      <ImportClient categories={categories} createAction={createRecipeAction} />
    </main>
  );
}
