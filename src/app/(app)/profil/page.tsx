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
import { getAppName } from "@/lib/config/app-config";

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  const [currentAppName, users, families, ownCategories, ownFamily] = await Promise.all([
    getAppName(),
    isAdmin
      ? prisma.user.findMany({
          select: { id: true, email: true, name: true, role: true, familyId: true, createdAt: true },
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
  ]);

  const familyOptions = families.map((f) => ({ id: f.id, name: f.name }));
  const familyList = families.map((f) => ({
    id: f.id,
    name: f.name,
    memberCount: f._count.members,
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 pb-10 pt-6 pt-safe px-safe pb-safe sm:px-6 sm:py-10">
      <header className="mb-8">
        <Link
          href="/rezepte"
          className="font-written text-sm text-ribbon underline underline-offset-4"
        >
          ← zurück
        </Link>
        <h1 className="mt-2 font-hand text-6xl text-ink ink-text">Profil</h1>
        <p className="font-written text-ink-faded">
          {session.user.name ? `${session.user.name} · ` : ""}
          {session.user.email}
          {isAdmin ? (
            <span className="ml-2 rounded-sm bg-ribbon/20 px-2 py-0.5 font-written text-xs text-ribbon">
              Admin
            </span>
          ) : null}
        </p>
      </header>

      <div className="space-y-8">
        <ChangePasswordForm />

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
