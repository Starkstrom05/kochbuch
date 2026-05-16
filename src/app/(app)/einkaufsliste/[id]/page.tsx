import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ShoppingListClient } from "@/components/shopping/ShoppingListClient";

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
  if (list.ownerId !== session.user.id) redirect("/einkaufsliste");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl text-ink ink-text">{list.name}</h1>
          {list.items.length > 0 && (
            <p className="font-written text-sm text-ink-faded">
              {list.items.filter((i) => !i.checked).length} noch zu kaufen
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/speiseplan"
            className="font-written text-sm text-ink-faded underline underline-offset-4"
          >
            ← Speiseplan
          </Link>
          <Link
            href="/einkaufsliste"
            className="font-written text-sm text-ink-faded underline underline-offset-4"
          >
            Alle Listen
          </Link>
        </div>
      </header>

      <ShoppingListClient
        listId={list.id}
        listName={list.name}
        items={list.items.map((i) => ({
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
