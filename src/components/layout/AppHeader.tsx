import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { listReadableCookbooks } from "@/lib/cookbooks/server";
import { CookbookSwitcher } from "@/components/cookbook/CookbookSwitcher";

/**
 * Header oberhalb aller (app)-Routen: Cookbook-Switcher, aktueller Cookbook-Name
 * als Titel, "Angemeldet als ..."-Link aufs Profil. Server-Component, laedt
 * Cookbooks fuer den Switcher.
 */
export async function AppHeader() {
  const session = await auth();
  if (!session?.user) return null;
  const actor = { id: session.user.id, role: session.user.role };
  const cookbooks = await listReadableCookbooks(actor);
  const active = cookbooks.find((c) => c.id === session.user.activeCookbookId) ?? null;
  const options = cookbooks.map((c) => ({
    id: c.id,
    name: c.name,
    isOwn: c.isOwn,
    ownerName: c.owner.name,
  }));

  return (
    <div className="bg-paper-100/80 ring-paper-300/60 border-paper-300/40 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="min-w-0">
          <Link href="/rezepte" className="font-hand text-ink ink-text block text-3xl leading-none">
            {active?.name ?? "Kochbuch"}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <CookbookSwitcher
            active={
              active
                ? {
                    id: active.id,
                    name: active.name,
                    isOwn: active.isOwn,
                    ownerName: active.owner.name,
                  }
                : null
            }
            options={options}
          />
          <Link
            href="/profil"
            className="font-written text-ink-faded hover:text-ink text-sm underline decoration-dotted underline-offset-4"
          >
            {session.user.name ?? session.user.email}
          </Link>
        </div>
      </div>
    </div>
  );
}
