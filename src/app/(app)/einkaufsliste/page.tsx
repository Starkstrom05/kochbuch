import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ShoppingListClient } from "@/components/shopping/ShoppingListClient";

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

  return (
    <main className="mx-auto max-w-2xl px-4 pb-10 pt-6 pt-safe px-safe pb-safe sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl text-ink ink-text">Einkaufsliste</h1>
          {items.length > 0 && (
            <p className="font-written text-sm text-ink-faded">
              {items.filter((i) => !i.checked).length} noch zu kaufen
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/vorraete"
            className="font-written text-sm text-ribbon underline underline-offset-4"
          >
            Was kann ich kochen?
          </Link>
          <Link
            href="/rezepte"
            className="font-written text-sm text-ink-faded underline underline-offset-4"
          >
            ← Rezepte
          </Link>
        </div>
      </header>

      <ShoppingListClient
        listId={list?.id ?? ""}
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          amount: i.amount,
          unit: i.unit,
          recipeRef: i.recipeRef,
          checked: i.checked,
        }))}
      />
    </main>
  );
}
