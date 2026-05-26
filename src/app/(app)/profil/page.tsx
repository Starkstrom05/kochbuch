import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { CreateUserForm } from "./CreateUserForm";
import { UserList } from "./UserList";
import { AppNameForm } from "./AppNameForm";
import { BackupSection } from "./BackupSection";
import { NutritionDataForm } from "./NutritionDataForm";
import { FamilyManager } from "./FamilyManager";
import { CategoryManager } from "./CategoryManager";
import { BrandingForm } from "./BrandingForm";
import { CookbookManager, type ManagedCookbook } from "./CookbookManager";
import { getAppName } from "@/lib/config/app-config";
import { WhatsNewMount } from "@/components/layout/WhatsNewMount";

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  const [currentAppName, users, families, ownCategories, ownFamily, cookbookRows, allUsers] =
    await Promise.all([
      getAppName(),
      isAdmin
        ? prisma.user.findMany({
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              familyId: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
      isAdmin
        ? prisma.family.findMany({
            select: { id: true, name: true, _count: { select: { members: true } } },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      isAdmin && session.user.familyId
        ? prisma.category.findMany({
            where: { familyId: session.user.familyId },
            select: { id: true, name: true, icon: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      isAdmin && session.user.familyId
        ? prisma.family.findUnique({
            where: { id: session.user.familyId },
            select: { name: true, accentColor: true, inkColor: true, paperColor: true },
          })
        : Promise.resolve(null),
      // Cookbooks: eigene + freigegebene. Admin sieht alle.
      isAdmin
        ? prisma.cookbook.findMany({
            include: {
              owner: { select: { id: true, name: true } },
              accesses: { include: { user: { select: { id: true, name: true } } } },
            },
            orderBy: [{ ownerId: "asc" }, { name: "asc" }],
          })
        : prisma.cookbook.findMany({
            where: {
              OR: [
                { ownerId: session.user.id },
                { accesses: { some: { userId: session.user.id } } },
              ],
            },
            include: {
              owner: { select: { id: true, name: true } },
              accesses: { include: { user: { select: { id: true, name: true } } } },
            },
            orderBy: [{ ownerId: "asc" }, { name: "asc" }],
          }),
      prisma.user.findMany({
        where: { id: { not: session.user.id } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const familyOptions = families.map((f) => ({ id: f.id, name: f.name }));
  const familyList = families.map((f) => ({
    id: f.id,
    name: f.name,
    memberCount: f._count.members,
  }));

  const cookbooks: ManagedCookbook[] = cookbookRows.map((c) => ({
    id: c.id,
    name: c.name,
    isOwn: c.ownerId === session.user.id,
    ownerName: c.owner.name,
    accentColor: c.accentColor,
    inkColor: c.inkColor,
    paperColor: c.paperColor,
    accesses: c.accesses.map((a) => ({ userId: a.userId, userName: a.user.name })),
  }));
  const ownCount = cookbooks.filter((c) => c.isOwn).length;
  const candidateUsers = allUsers.map((u) => ({ id: u.id, name: u.name, email: u.email }));

  return (
    <main className="pt-safe px-safe pb-safe mx-auto max-w-2xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-8">
        <Link
          href="/rezepte"
          className="font-written text-ribbon text-sm underline underline-offset-4"
        >
          ← zurück
        </Link>
        <h1 className="font-hand text-ink ink-text mt-2 text-6xl">Profil</h1>
        <p className="font-written text-ink-faded">
          {session.user.name ? `${session.user.name} · ` : ""}
          {session.user.email}
          {isAdmin ? (
            <span className="bg-ribbon/20 font-written text-ribbon ml-2 rounded-sm px-2 py-0.5 text-xs">
              Admin
            </span>
          ) : null}
        </p>
      </header>

      <div className="space-y-8">
        <ChangePasswordForm />

        <CookbookManager
          cookbooks={cookbooks}
          ownCount={ownCount}
          candidateUsers={candidateUsers}
        />

        <WhatsNewMount variant="button" />

        <Link
          href="/hilfe"
          className="paper-card flex items-center justify-between gap-4 p-6 transition hover:rotate-[-0.2deg]"
        >
          <div>
            <h2 className="font-hand text-ink text-3xl">Hilfe</h2>
            <p className="font-written text-ink-faded mt-1 text-sm">
              Kurzanleitungen zu allen Funktionen.
            </p>
          </div>
          <span aria-hidden className="font-hand text-ribbon text-3xl">
            →
          </span>
        </Link>

        <Link
          href="/profil/ourgroceries"
          className="paper-card flex items-center justify-between gap-4 p-6 transition hover:rotate-[-0.2deg]"
        >
          <div>
            <h2 className="font-hand text-ink text-3xl">OurGroceries-Brücke</h2>
            <p className="font-written text-ink-faded mt-1 text-sm">
              Einkaufsliste direkt in die OurGroceries-App pushen (Opt-In).
            </p>
          </div>
          <span aria-hidden className="font-hand text-ribbon text-3xl">
            →
          </span>
        </Link>

        {isAdmin ? (
          <>
            <AppNameForm currentName={currentAppName} />
            <FamilyManager families={familyList} />
            {ownFamily ? <BrandingForm branding={ownFamily} /> : null}
            <CategoryManager categories={ownCategories} />
            <BackupSection />
            <NutritionDataForm />
            <UserList users={users} currentUserId={session.user.id} families={familyOptions} />
            <CreateUserForm families={familyOptions} />
          </>
        ) : null}
      </div>
    </main>
  );
}
