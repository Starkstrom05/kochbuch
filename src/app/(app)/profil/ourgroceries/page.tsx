import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { isCredentialsKeyConfigured } from "@/lib/crypto/credentials";
import { OurGroceriesSetupForm } from "./OurGroceriesSetupForm";

export default async function OurGroceriesSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const configured = isCredentialsKeyConfigured();
  const creds = configured
    ? await prisma.userOurGroceriesCredentials.findUnique({
        where: { userId: session.user.id },
        select: { defaultListId: true, defaultListName: true, lastSyncAt: true },
      })
    : null;

  const status = creds
    ? {
        state: "connected" as const,
        defaultListId: creds.defaultListId,
        defaultListName: creds.defaultListName,
        lastSyncAt: creds.lastSyncAt,
      }
    : { state: "disconnected" as const };

  return (
    <main className="pt-safe px-safe pb-safe mx-auto max-w-2xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-8">
        <Link
          href="/profil"
          className="font-written text-ribbon text-sm underline underline-offset-4"
        >
          ← Profil
        </Link>
        <h1 className="font-hand text-ink ink-text mt-2 text-6xl">OurGroceries</h1>
        <p className="font-written text-ink-faded">
          Direkt-Export der Einkaufsliste in deine OurGroceries-App.
        </p>
      </header>

      <div className="space-y-8">
        <OurGroceriesSetupForm status={status} configured={configured} />
      </div>
    </main>
  );
}
