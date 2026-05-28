import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ShoppingListClient } from "@/components/shopping/ShoppingListClient";
import { attachCategories } from "@/lib/shopping/category-lookup";
import { getFrequentItems } from "@/lib/shopping/frequent";
import { selectMasterListItems } from "@/lib/shopping/master-list";

export default async function EinkaufslistePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const list = await prisma.shoppingList.findFirst({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { orderBy: { id: "asc" } } },
  });

  // Create an empty list lazily if none exists
  const items = list?.items ?? [];
  const enriched = await attachCategories(
    items.map((i) => ({
      id: i.id,
      name: i.name,
      amount: i.amount,
      unit: i.unit,
      recipeRef: i.recipeRef,
      checked: i.checked,
    })),
  );
  const frequent = await getFrequentItems(session.user.id);
  const masterList = selectMasterListItems(
    frequent,
    enriched.map((i) => i.name),
  );

  return (
    <main className="pt-safe px-safe pb-safe mx-auto max-w-2xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-hand text-ink ink-text text-5xl">Einkaufsliste</h1>
          {items.length > 0 && (
            <p className="font-written text-ink-faded text-sm">
              {items.filter((i) => !i.checked).length} noch zu kaufen
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/vorraete"
            className="font-written text-ribbon text-sm underline underline-offset-4"
          >
            Was kann ich kochen?
          </Link>
          <Link
            href="/rezepte"
            className="font-written text-ink-faded text-sm underline underline-offset-4"
          >
            ← Rezepte
          </Link>
        </div>
      </header>

      <ShoppingListClient listId={list?.id ?? ""} items={enriched} frequentItems={masterList} />
    </main>
  );
}
