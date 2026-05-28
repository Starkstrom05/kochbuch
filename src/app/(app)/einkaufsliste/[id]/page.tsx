import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ShoppingListClient } from "@/components/shopping/ShoppingListClient";
import { attachCategories } from "@/lib/shopping/category-lookup";
import { getFrequentItems } from "@/lib/shopping/frequent";
import { selectMasterListItems } from "@/lib/shopping/master-list";
import { canAccessShoppingList } from "@/lib/shopping/permissions";
import { actorFromSession } from "@/lib/auth/helpers";

type Props = { params: Promise<{ id: string }> };

export default async function EinkaufslisteDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const list = await prisma.shoppingList.findUnique({
    where: { id },
    include: { items: { orderBy: { id: "asc" } } },
  });

  if (!list) notFound();
  if (!(await canAccessShoppingList(actorFromSession(session), id))) redirect("/einkaufsliste");

  const enriched = await attachCategories(
    list.items.map((i) => ({
      id: i.id,
      name: i.name,
      amount: i.amount,
      unit: i.unit,
      recipeRef: i.recipeRef,
      checked: i.checked,
      note: i.note,
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
          <h1 className="font-hand text-ink ink-text text-5xl">{list.name}</h1>
          {list.items.length > 0 && (
            <p className="font-written text-ink-faded text-sm">
              {list.items.filter((i) => !i.checked).length} noch zu kaufen
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/speiseplan"
            className="font-written text-ink-faded text-sm underline underline-offset-4"
          >
            ← Speiseplan
          </Link>
          <Link
            href="/einkaufsliste"
            className="font-written text-ink-faded text-sm underline underline-offset-4"
          >
            Alle Listen
          </Link>
        </div>
      </header>

      <ShoppingListClient
        listId={list.id}
        listName={list.name}
        items={enriched}
        frequentItems={masterList}
      />
    </main>
  );
}
